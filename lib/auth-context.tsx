'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { cloud } from './cloud'
import { claimSiteOwnership, getSiteProfile } from './api'
import type { SiteProfile } from './types'

export interface SessionUser {
  id: string
  email: string | null
}

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  isSiteOwner: boolean
  profile: SiteProfile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 SiteShell 内部使用')
  return ctx
}

function displayNameFrom(email: string | null, id: string): string {
  if (email) {
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
    if (name) return name
  }
  return `dev-${id.slice(0, 4)}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<SiteProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const loadProfile = useCallback(async (uid?: string) => {
    setProfileLoading(true)
    try {
      const existing = await getSiteProfile()
      if (existing) {
        setProfile(existing)
      } else if (uid) {
        // 首个登录用户自动成为博主本人
        const claimed = await claimSiteOwnership(
          uid,
          null,
          displayNameFrom(
            (window as unknown as { __lastEmail?: string }).__lastEmail ?? null,
            uid,
          ),
        )
        setProfile(claimed)
      } else {
        setProfile(null)
      }
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: session } = await cloud.auth.getSession()
    await loadProfile(session?.user?.id)
  }, [loadProfile])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      // 微信网页登录回调必须无条件先跑，且早于任何路由守卫
      try {
        const { data: session, error } = await cloud.auth.handleWechatWebCallback()
        if (error) {
          console.warn('[blog] wechat callback:', error.message)
        } else if (session) {
          // 清理一次性 code / state，避免刷新重放已消费的 code
          window.history.replaceState(null, '', window.location.pathname)
        }
      } catch (e) {
        console.warn('[blog] wechat callback failed:', e)
      }

      const { data: session } = await cloud.auth.getSession()
      if (cancelled) return
      const u = session?.user
      setUser(u ? { id: u.id, email: (u as { email?: string }).email ?? null } : null)
      setLoading(false)
      await loadProfile(u?.id)
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [loadProfile])

  useEffect(() => {
    const unsubscribe = cloud.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user
      const next = u ? { id: u.id, email: (u as { email?: string }).email ?? null } : null
      setUser(next)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setProfileLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        await loadProfile(next?.id)
      }
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    const { error } = await cloud.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isSiteOwner: !!user && !!profile && profile.uid === user.id,
      profile,
      profileLoading,
      refreshProfile,
      signOut,
    }),
    [user, loading, profile, profileLoading, refreshProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
