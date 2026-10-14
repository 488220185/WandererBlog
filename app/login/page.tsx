'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cloud } from '@/lib/cloud'
import { useAuth } from '@/lib/auth-context'
import { SITE_NAME } from '@/lib/brand'

type Mode = 'password' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')

  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  // 验证码挑战信息保存在表单状态之外，提交时复用，不重复发码
  const [pendingOtp, setPendingOtp] = useState<{
    email: string
    verificationId: string
    isExistingUser: boolean
  } | null>(null)

  useEffect(() => {
    if (!loading && user) router.replace('/admin')
  }, [user, loading, router])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendCode() {
    setError(null)
    setNotice(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入正确的邮箱地址')
      return
    }
    setSending(true)
    try {
      const { data, error: err } = await cloud.auth.sendOtp({ email })
      if (err || !data) {
        setError(err?.message ?? '验证码发送失败，请稍后重试')
        return
      }
      setPendingOtp({
        email,
        verificationId: data.verificationId,
        isExistingUser: data.isExistingUser,
      })
      setCountdown(60)
      setNotice('验证码已发送到你的邮箱，请在 10 分钟内使用')
    } catch {
      setError('发送失败，请检查网络后重试')
    } finally {
      setSending(false)
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const { error: err } = await cloud.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message || '账号或密码不正确')
        return
      }
      router.push('/admin')
    } catch {
      setError('登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const pending = pendingOtp
    if (!pending || pending.email !== email) {
      setError('请先为当前邮箱获取验证码')
      return
    }
    if (!code.trim()) {
      setError('请输入验证码')
      return
    }

    setSubmitting(true)
    try {
      const { error: err } = await cloud.auth.verifyOtp({
        email: pending.email,
        verificationId: pending.verificationId,
        isExistingUser: pending.isExistingUser,
        token: code.trim(),
        // 新账号首次登录需要设置密码
        password: pending.isExistingUser ? undefined : password || undefined,
      })
      if (err) {
        setError(err.message)
        return
      }
      router.push('/admin')
    } catch {
      setError('验证失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function wechatLogin() {
    setError(null)
    try {
      const { data, error: err } = await cloud.auth.signInWithOAuth({
        provider: 'wechat',
        redirectTo: window.location.origin,
      })
      if (err || !data) {
        setError(err?.message ?? '微信登录发起失败，请稍后重试')
        return
      }
      window.location.assign(data.url)
    } catch {
      setError('微信登录发起失败，请稍后重试')
    }
  }

  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="font-mono text-xs text-accent/80">$ auth --login</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-50">
            {mode === 'password' ? '登录账号' : '验证码登录'}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            登录{SITE_NAME}，即可写文章、上传图片与附件
          </p>
        </header>

        <div className="card p-6">
          <div className="mb-5 flex rounded-lg border border-ink-600 bg-ink-900/60 p-1">
            {(
              [
                ['password', '密码登录'],
                ['otp', '验证码登录'],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  setNotice(null)
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  mode === m ? 'bg-ink-750 text-accent' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'password' ? submitPassword : submitOtp} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field"
                autoComplete="email"
                required
              />
            </div>

            {mode === 'otp' && (
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">验证码</label>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 位验证码"
                    className="field font-mono tracking-widest"
                    inputMode="numeric"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => void sendCode()}
                    disabled={sending || countdown > 0}
                    className="btn-ghost shrink-0 !px-3 text-xs"
                  >
                    {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '获取验证码'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs text-slate-400">
                密码{mode === 'otp' && <span className="text-slate-600">（首次登录需设置）</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'otp' ? '至少 6 位' : '••••••••'}
                className="field"
                autoComplete={mode === 'password' ? 'current-password' : 'new-password'}
                required={mode === 'password'}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
                {notice}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? '处理中…' : mode === 'password' ? '登录' : '验证并登录'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink-700" />
            <span className="text-[11px] text-slate-600">或</span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>

          <button onClick={() => void wechatLogin()} className="btn-ghost w-full">
            <span className="text-sm">微信</span>
            <span className="text-xs">扫码 / 快捷登录</span>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          没有账号？用邮箱验证即可自动注册 ·{' '}
          <Link href="/" className="text-slate-500 hover:text-accent">
            先随便逛逛
          </Link>
        </p>
      </div>
    </div>
  )
}
