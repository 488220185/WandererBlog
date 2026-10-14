'use client'

import { cloud, storageAvailable } from './cloud'
import { SITE_AUTHOR, SITE_NAME, SITE_SUBTITLE } from './brand'
import {
  Attachment,
  POSTS_PER_PAGE,
  Post,
  SiteProfile,
  estimateReadingMinutes,
} from './types'

/* ------------------------------------------------------------------ *
 * 文章数据访问
 * ------------------------------------------------------------------ */

export interface ListOptions {
  page?: number
  tag?: string
  keyword?: string
  /** 传入当前用户 id 时，同时返回该用户的草稿 */
  includeDrafts?: boolean
  ownerId?: string
}

export async function listPosts(opts: ListOptions = {}) {
  const { page = 1, tag, keyword, includeDrafts, ownerId } = opts
  const from = (page - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  let query = cloud.database
    .from('posts')
    .select(
      'id, title, slug, excerpt, cover_url, tags, status, views, reading_minutes, created_at, updated_at, owner_id',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (includeDrafts && ownerId) {
    query = query.or(`status.eq.published,owner_id.eq.${ownerId}`)
  } else {
    query = query.eq('status', 'published')
  }

  if (tag) query = query.contains('tags', [tag])
  if (keyword) {
    const safe = keyword.replace(/[,()]/g, ' ')
    query = query.or(`title.ilike.*${safe}*,excerpt.ilike.*${safe}*`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { posts: (data ?? []) as Post[], total: count ?? 0 }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await cloud.database
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return (data as Post | null) ?? null
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await cloud.database
    .from('posts')
    .select('tags')
    .eq('status', 'published')
  if (error) throw error
  const counter = new Map<string, number>()
  for (const row of (data ?? []) as { tags: string[] }[]) {
    for (const t of row.tags ?? []) counter.set(t, (counter.get(t) ?? 0) + 1)
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export interface PostInput {
  title: string
  slug: string
  excerpt?: string | null
  content_md: string
  cover_url?: string | null
  tags: string[]
  status: 'published' | 'draft'
}

export async function createPost(input: PostInput): Promise<Post> {
  const { data, error } = await cloud.database
    .from('posts')
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content_md: input.content_md,
      cover_url: input.cover_url ?? null,
      tags: input.tags,
      status: input.status,
      reading_minutes: estimateReadingMinutes(input.content_md),
    })
    .select()
    .single()
  if (error) throw error
  return data as Post
}

export async function updatePost(id: number, input: PostInput): Promise<Post> {
  const { data, error } = await cloud.database
    .from('posts')
    .update({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content_md: input.content_md,
      cover_url: input.cover_url ?? null,
      tags: input.tags,
      status: input.status,
      reading_minutes: estimateReadingMinutes(input.content_md),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
  if (error) throw error
  const rows = (data ?? []) as Post[]
  if (rows.length === 0) {
    throw new Error('文章不存在，或你没有权限修改它')
  }
  return rows[0]
}

export async function deletePost(id: number): Promise<void> {
  const { data, error } = await cloud.database
    .from('posts')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('文章不存在，或你没有权限删除它')
  }
}

/** 浏览量 +1：RLS 下只有作者本人能改，所以改用 RPC，见下方函数定义 */
export async function increaseView(slug: string): Promise<void> {
  try {
    await cloud.database.rpc('bump_post_view', { p_slug: slug })
  } catch {
    /* 统计失败不影响阅读 */
  }
}

/* ------------------------------------------------------------------ *
 * 站点信息（博主本人 / 站点标题）
 * ------------------------------------------------------------------ */

export async function getSiteProfile(): Promise<SiteProfile | null> {
  const { data, error } = await cloud.database
    .from('site_owner')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as SiteProfile | null) ?? null
}

/** 首个注册用户自动成为博主本人，可编辑全部文章 */
export async function claimSiteOwnership(
  uid: string,
  email: string | null,
  authorName: string,
): Promise<SiteProfile> {
  const existing = await getSiteProfile()
  if (existing) return existing

  const { data, error } = await cloud.database
    .from('site_owner')
    .insert({
      id: 1,
      uid,
      owner_email: email,
      author_name: authorName || SITE_AUTHOR,
      blog_title: SITE_NAME,
      blog_subtitle: SITE_SUBTITLE,
      author_bio:
        '前端与全栈开发者。这里存放我在真实项目里踩过的坑、以及验证过的解法，尽量把「为什么这么做」讲清楚。',
    })
    .select()
    .single()
  if (error) throw error
  return data as SiteProfile
}

export async function updateSiteProfile(
  patch: Partial<Pick<SiteProfile, 'blog_title' | 'blog_subtitle' | 'author_name' | 'author_bio'>>,
): Promise<SiteProfile> {
  const { data, error } = await cloud.database
    .from('site_owner')
    .update(patch)
    .eq('id', 1)
    .select()
  if (error) throw error
  const rows = (data ?? []) as SiteProfile[]
  if (rows.length === 0) throw new Error('没有权限修改站点信息')
  return rows[0]
}

/* ------------------------------------------------------------------ *
 * 云存储：图片与附件
 * ------------------------------------------------------------------ */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_FILE_BYTES = 20 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

function safeName(name: string): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const stem = name
    .replace(/\.[^.]*$/, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .slice(0, 40)
  return `${stem || 'file'}${ext}`.toLowerCase()
}

async function requireSession() {
  const { data: session, error } = await cloud.auth.getSession()
  const user = session?.user
  if (error || !user) throw new Error('请先登录后再上传文件')
  return user
}

function requireStorage() {
  if (!storageAvailable || !cloud.storage) {
    throw new Error('当前部署后端未启用文件存储。可改用外链图片，或切换回 WorkBuddy 后端')
  }
  return cloud.storage
}

/** 上传图片，返回可直接插入 Markdown 的 Markdown 片段 */
export async function uploadImage(file: File): Promise<string> {
  const storage = requireStorage()
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('只支持 PNG / JPEG / GIF / WebP / SVG 图片')
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 5 MB')

  const session = await requireSession()
  const path = storage.sharedPath(
    session.id,
    `images/${crypto.randomUUID()}-${safeName(file.name)}`,
  )
  const { error } = await storage.upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return `storage:${path}`
}

/** 上传任意附件（PDF、zip、示例工程等） */
export async function uploadAttachment(file: File): Promise<Attachment> {
  const storage = requireStorage()
  if (file.size > MAX_FILE_BYTES) throw new Error('附件不能超过 20 MB')
  const session = await requireSession()
  const path = storage.sharedPath(
    session.id,
    `files/${crypto.randomUUID()}-${safeName(file.name)}`,
  )
  const { error } = await storage.upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return { name: file.name, path, size: file.size, contentType: file.type }
}

/** 由存储路径换取临时访问链接（默认 10 分钟有效） */
export async function resolveStorageUrl(path: string, ttl = 600): Promise<string | null> {
  if (!storageAvailable) return null
  const { data, error } = await cloud.storage!.createSignedUrl(path, ttl)
  if (error || !data) return null
  const url = (data as { url?: string }).url ?? String(data)
  return url
}
