'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { SITE_NAME, SITE_SUBTITLE } from '@/lib/brand'

const NAV = [
  { href: '/', label: '文章' },
  { href: '/tags', label: '标签' },
  { href: '/about', label: '关于' },
]

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent-soft font-mono text-sm font-bold text-accent transition-all group-hover:shadow-[0_0_18px_-4px_rgba(74,222,128,0.7)]">
        {'</>'}
      </span>
      <span className="hidden sm:block">
        <span className="block text-sm font-bold tracking-tight text-slate-100">{SITE_NAME}</span>
        <span className="block font-mono text-[10px] text-slate-500">{SITE_SUBTITLE}</span>
      </span>
    </Link>
  )
}

function Header() {
  const pathname = usePathname()
  const { user, isSiteOwner, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  const active = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/posts/') : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 border-b border-ink-700/70 bg-ink-950/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active(item.href)
                  ? 'bg-ink-800 text-accent'
                  : 'text-slate-400 hover:bg-ink-850 hover:text-slate-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/admin" className="btn-ghost !px-3 !py-1.5 text-xs">
                {isSiteOwner ? '写作台' : '我的文章'}
              </Link>
              <span
                className="max-w-[140px] truncate rounded-lg border border-ink-600 bg-ink-800/70 px-2.5 py-1.5 font-mono text-[11px] text-slate-400"
                title={user.email ?? user.id}
              >
                {user.email ?? user.id.slice(0, 10)}
              </span>
              <button onClick={() => void signOut()} className="btn-ghost !px-3 !py-1.5 text-xs">
                退出
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-ghost hidden !px-3.5 !py-1.5 text-xs md:inline-flex">
              登录 / 注册
            </Link>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost !px-2.5 !py-1.5 md:hidden"
            aria-label="切换菜单"
          >
            <span className="font-mono text-sm">{open ? '×' : '≡'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-700/70 bg-ink-900/95 md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active(item.href) ? 'bg-ink-800 text-accent' : 'text-slate-400'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-ink-700/70 pt-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link href="/admin" className="btn-primary flex-1 text-xs">
                    {isSiteOwner ? '写作台' : '我的文章'}
                  </Link>
                  <button onClick={() => void signOut()} className="btn-ghost text-xs">
                    退出
                  </button>
                </div>
              ) : (
                <Link href="/login" className="btn-primary w-full text-xs">
                  登录 / 注册
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-700/70">
      <div className="container-page flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-mono text-xs text-slate-500">
          <span className="text-accent">$</span> Built with Next.js · Markdown · WorkBuddy Cloud
        </p>
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} {SITE_NAME} · 文章内容仅代表个人实践，水平有限，欢迎指正
        </p>
      </div>
    </footer>
  )
}

function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  )
}

export default SiteShell
