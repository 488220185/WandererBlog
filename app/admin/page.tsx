'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import PostEditor from '@/components/PostEditor'
import {
  createPost,
  deletePost,
  getPostBySlug,
  listPosts,
  updatePost,
  updateSiteProfile,
  type PostInput,
} from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDate, type Post } from '@/lib/types'

function AdminInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, loading, isSiteOwner, profile, refreshProfile } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [editing, setEditing] = useState<Post | null>(null)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [tab, setTab] = useState<'posts' | 'site'>('posts')
  const [site, setSite] = useState({
    blog_title: '',
    blog_subtitle: '',
    author_name: '',
    author_bio: '',
  })

  const editId = params.get('edit')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  const load = useCallback(async () => {
    if (!user) return
    setLoadingList(true)
    try {
      const { posts } = await listPosts({ page: 1, includeDrafts: true, ownerId: user.id })
      setPosts(posts)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoadingList(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (profile) {
      setSite({
        blog_title: profile.blog_title,
        blog_subtitle: profile.blog_subtitle,
        author_name: profile.author_name,
        author_bio: profile.author_bio,
      })
    }
  }, [profile])

  // 支持从文章详情页跳转过来直接编辑
  useEffect(() => {
    if (!editId || editing || creating) return
    void getPostBySlugById(editId)
  }, [editId, editing, creating])

  async function getPostBySlugById(id: string) {
    try {
      const all = await listPosts({ page: 1, includeDrafts: true, ownerId: user?.id })
      const found = all.posts.find((p) => String(p.id) === id)
      if (found) {
        setEditing(found)
        router.replace('/admin')
      }
    } catch {
      /* 忽略 */
    }
  }

  async function handleSubmit(input: PostInput) {
    setSubmitting(true)
    setError(null)
    try {
      if (editing) {
        await updatePost(editing.id, input)
        setToast('文章已更新')
      } else {
        await createPost(input)
        setToast('文章已发布')
      }
      setEditing(null)
      setCreating(false)
      router.replace('/admin')
      await load()
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 2600)
    }
  }

  async function handleDelete(p: Post) {
    const confirmed = window.confirm(
      `确定删除《${p.title}》吗？\n此操作不可撤销，正文和标签都会一并删除。`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await deletePost(p.id)
      setToast('已删除')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
    setTimeout(() => setToast(null), 2600)
  }

  async function saveSite() {
    setError(null)
    try {
      await updateSiteProfile(site)
      await refreshProfile()
      setToast('站点信息已保存')
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
    setTimeout(() => setToast(null), 2600)
  }

  if (loading || !user) {
    return (
      <div className="container-page py-24 text-center">
        <p className="font-mono text-sm text-slate-500">检查登录状态…</p>
      </div>
    )
  }

  if (creating || editing) {
    return (
      <div className="container-page py-10">
        <div className="mb-7 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-slate-50">
            {editing ? '编辑文章' : '写新文章'}
          </h1>
          <button
            onClick={() => {
              setCreating(false)
              setEditing(null)
            }}
            className="btn-ghost text-xs"
          >
            取消
          </button>
        </div>
        <PostEditor
          initial={
            editing
              ? {
                  id: editing.id,
                  title: editing.title,
                  slug: editing.slug,
                  excerpt: editing.excerpt ?? '',
                  content_md: editing.content_md,
                  tags: editing.tags ?? [],
                  status: editing.status,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
          }}
          submitting={submitting}
        />
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-accent/80">$ ./writing-desk</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-50">
            {isSiteOwner ? '写作台' : '我的文章'}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {isSiteOwner
              ? '你是站点博主，可以管理全部文章与站点信息'
              : '这里只显示你写的文章'}
          </p>
        </div>
        <div className="flex gap-2">
          {isSiteOwner && (
            <button
              onClick={() => setTab(tab === 'posts' ? 'site' : 'posts')}
              className="btn-ghost text-xs"
            >
              {tab === 'posts' ? '站点设置' : '文章列表'}
            </button>
          )}
          <button onClick={() => setCreating(true)} className="btn-primary text-xs">
            + 写新文章
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-5 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {toast && (
        <p className="mb-5 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
          {toast}
        </p>
      )}

      {tab === 'site' && isSiteOwner ? (
        <div className="max-w-2xl space-y-4">
          <div className="card space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">站点标题</label>
              <input
                value={site.blog_title}
                onChange={(e) => setSite({ ...site, blog_title: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">副标题</label>
              <input
                value={site.blog_subtitle}
                onChange={(e) => setSite({ ...site, blog_subtitle: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">作者昵称</label>
              <input
                value={site.author_name}
                onChange={(e) => setSite({ ...site, author_name: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">作者简介</label>
              <textarea
                value={site.author_bio}
                onChange={(e) => setSite({ ...site, author_bio: e.target.value })}
                rows={4}
                className="field resize-none leading-relaxed"
              />
            </div>
            <button onClick={() => void saveSite()} className="btn-primary">
              保存站点信息
            </button>
          </div>

          <div className="card p-6">
            <h3 className="mb-2 text-sm font-bold text-slate-100">存储与登录</h3>
            <p className="text-xs leading-relaxed text-slate-500">
              文章正文保存在云端数据库，图片和附件保存在云端存储，账号通过邮箱验证或微信登录。
              当前登录账号：
              <span className="font-mono text-slate-300">{user.email ?? user.id}</span>
            </p>
            <Link href="/" className="btn-ghost mt-4 text-xs">
              查看站点 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loadingList ? (
            <div className="card h-24 animate-pulse bg-ink-850/50" />
          ) : posts.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="font-mono text-2xl text-slate-700">✎</span>
              <p className="text-sm text-slate-400">还没有文章，写第一篇吧</p>
              <button onClick={() => setCreating(true)} className="btn-primary text-xs">
                + 写新文章
              </button>
            </div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/posts/${p.slug}`}
                      className="truncate text-sm font-bold text-slate-100 hover:text-accent"
                    >
                      {p.title}
                    </Link>
                    <span
                      className={`chip ${
                        p.status === 'published'
                          ? 'chip-active'
                          : 'border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {p.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500">
                    <span>{formatDate(p.created_at)}</span>
                    <span className="text-ink-600">/</span>
                    <span>{p.reading_minutes} min</span>
                    <span className="text-ink-600">/</span>
                    <span>{p.views} 阅读</span>
                    {(p.tags ?? []).slice(0, 3).map((t) => (
                      <span key={t} className="chip">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => void handleDelete(p)}
                    className="btn-danger !px-3 !py-1.5 text-xs"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-24 text-center">
          <p className="font-mono text-sm text-slate-500">加载中…</p>
        </div>
      }
    >
      <AdminInner />
    </Suspense>
  )
}
