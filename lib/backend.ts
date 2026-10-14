/**
 * 后端适配层。
 *
 * 通过环境变量切换数据后端，业务代码只依赖这里导出的接口：
 *   - `NEXT_PUBLIC_BACKEND=workbuddy`（默认）→ WorkBuddy 云服务
 *   - `NEXT_PUBLIC_BACKEND=supabase`             → Supabase / Vercel 部署
 *
 * 两者的查询语法都是 PostgREST 风格（supabase-js 兼容），因此适配成本很低。
 */

export type BackendKind = 'workbuddy' | 'supabase'

// 类型专用：编译期擦除，不会进入产物
import type { Database } from './database.types'

function detectBackend(): BackendKind {
  const raw = process.env.NEXT_PUBLIC_BACKEND
  if (raw === 'supabase') return 'supabase'
  return 'workbuddy'
}

export const backendKind: BackendKind = detectBackend()
export const isSupabase = backendKind === 'supabase'

/* ------------------------------------------------------------------ *
 * WorkBuddy 后端
 *    直接创建实例，不经过 cloud.ts（那里是反向代理，会造成循环依赖）
 * ------------------------------------------------------------------ */
async function getWorkBuddyCloud() {
  const { createWorkBuddyCloud } = await import('@tencent-ai/workbuddy-cloud-sdk')
  const { publicConfig } = await import('./cloud-config')
  return createWorkBuddyCloud<Database>({
    endpoint: publicConfig.endpoint,
    oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl,
    publishableKey: publicConfig.publishableKey,
  })
}

/* ------------------------------------------------------------------ *
 * Supabase 后端
 * ------------------------------------------------------------------ */
let supabaseClientPromise: Promise<any> | null = null

async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      // 新项目是 publishable key（sb_publishable_），旧项目是 anon key（eyJ...）。
      // 两个变量名都兼容，避免按旧教程配置时读不到。
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      if (!url || !key) {
        throw new Error(
          '缺少 Supabase 配置：NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY（或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）',
        )
      }
      const { createClient } = await import('@supabase/supabase-js')
      return createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    })()
  }
  return supabaseClientPromise
}

/* ------------------------------------------------------------------ *
 * 统一入口
 * ------------------------------------------------------------------ */

export interface CloudAuth {
  getSession(): Promise<{ data: { user: { id: string; email?: string } | null } | null; error: unknown }>
  signInWithPassword(args: { email: string; password: string }): Promise<{ error: { message: string } | null }>
  sendOtp(args: { email: string }): Promise<{ data: { verificationId: string; isExistingUser: boolean } | null; error: { message: string } | null }>
  verifyOtp(args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>
  signUp(args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>
  signOut(): Promise<{ error: { message: string } | null }>
  onAuthStateChange(cb: (event: string, session: { user: { id: string; email?: string } | null } | null) => void): () => void
  handleWechatWebCallback(): Promise<{ data: unknown; error: { message: string } | null }>
  signInWithOAuth(args: Record<string, unknown>): Promise<{ data: { url: string } | null; error: { message: string } | null }>
}

export interface CloudDatabase {
  from(table: string): any
  rpc(fn: string, args?: Record<string, unknown>): any
}

export interface CloudStorage {
  sharedPath(uid: string, path: string): string
  upload(path: string, body: Blob, options?: Record<string, unknown>): Promise<{ error: unknown }>
  createSignedUrl(path: string, ttl?: number): Promise<{ data: unknown; error: unknown }>
}

export interface CloudBundle {
  auth: CloudAuth
  database: CloudDatabase
  storage?: CloudStorage
}

let bundlePromise: Promise<CloudBundle> | null = null

/**
 * 获取统一的后端客户端。首次调用后复用同一实例。
 */
export async function getCloud(): Promise<CloudBundle> {
  if (bundlePromise) return bundlePromise

  bundlePromise = (async (): Promise<CloudBundle> => {
    if (!isSupabase) {
      const c = await getWorkBuddyCloud()
      return c as unknown as CloudBundle
    }

    const supabase = await getSupabaseClient()
    return {
      auth: adaptSupabaseAuth(supabase),
      database: {
        from: (table: string) => supabase.from(table),
        rpc: (fn: string, args?: Record<string, unknown>) => supabase.rpc(fn, args),
      },
      // 文件上传暂未实现 Supabase Storage 版本，见 README
    }
  })()

  return bundlePromise
}

/** 把 Supabase auth 适配成与 WorkBuddy 一致的调用形状 */
function adaptSupabaseAuth(supabase: any): CloudAuth {
  const wrap = (p: Promise<{ data: any; error: any }>) =>
    p.then((r) => ({ data: r.data, error: r.error ? { message: r.error.message } : null })) as any

  return {
    async getSession() {
      const { data, error } = await supabase.auth.getSession()
      return {
        data: data.session
          ? { user: { id: data.session.user.id, email: data.session.user.email } }
          : null,
        error: error ? { message: error.message } : null,
      }
    },

    async signInWithPassword({ email, password }) {
      return wrap(await supabase.auth.signInWithPassword({ email, password }))
    },

    async sendOtp({ email }) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) return { data: null, error: { message: error.message } }
      // Supabase 自带验证码流程，不返回 verificationId；这里给一个占位标记
      return { data: { verificationId: 'supabase-otp', isExistingUser: true }, error: null }
    },

    async verifyOtp({ token, email }) {
      return wrap(await supabase.auth.verifyOtp({ email: email as string, token: token as string, type: 'email' }))
    },

    async signUp(args) {
      return wrap(await supabase.auth.signUp(args as any))
    },

    async signOut() {
      return wrap(await supabase.auth.signOut())
    },

    onAuthStateChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((event: string, session: any) => {
        cb(event, session ? { user: { id: session.user.id, email: session.user.email } } : null)
      })
      return () => data.subscription.unsubscribe()
    },

    async handleWechatWebCallback() {
      // Supabase 走自有 OAuth 流程，此处无平台回调
      return { data: null, error: null }
    },

    async signInWithOAuth() {
      return {
        data: null,
        error: { message: '当前后端未启用微信登录，请使用邮箱登录' },
      }
    },
  }
}
