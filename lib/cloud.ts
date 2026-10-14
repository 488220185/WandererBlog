'use client'

import { getCloud, isSupabase } from './backend'

/**
 * 统一云服务入口。
 * 通过代理把方法调用转发到当前启用的后端（WorkBuddy / Supabase），
 * 业务代码无需关心底层用的是哪一个。
 */
export const cloud = new Proxy(
  {} as Awaited<ReturnType<typeof getCloud>>,
  {
    get(_target, prop: string) {
      return (...args: unknown[]) =>
        getCloud().then((c) => {
          const value = (c as unknown as Record<string, unknown>)[prop]
          if (typeof value !== 'function') {
            throw new Error(`后端不支持该能力: ${prop}`)
          }
          return (value as (...a: unknown[]) => unknown)(...args)
        })
    },
  },
)

/** 云存储是否可用（Supabase 后端暂未接入 Storage） */
export const storageAvailable = !isSupabase
