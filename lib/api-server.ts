/**
 * 服务端数据访问层。
 * 拆分原因：SEO 要求文章正文进初始 HTML，所以读路径必须在服务端完成。
 * 这个文件不参与客户端打包，可以安全地在 RSC 里 import。
 */
import { getCloud } from './backend'
import { POSTS_PER_PAGE, type Post, type SiteProfile } from './types'

/** 服务端只读已发布内容，不携带用户会话 */
async function db() {
  const c = await getCloud()
  return c.database
}

export interface ServerListOptions {
  page?: number
  tag?: string
  keyword?: string
}

export interface ServerListResult {
  posts: Post[]
  total: number
  totalPages: number
}

export async function serverListPosts(opts: ServerListOptions = {}): Promise<ServerListResult> {
  const { page = 1, tag, keyword } = opts
  const from = (page - 1) * POSTS_PER_PAGE
  const to = from + POSTS_PER_PAGE - 1

  const database = await db()
  let query = database
    .from('posts')
    .select(
      'id, title, slug, excerpt, cover_url, tags, status, views, reading_minutes, created_at, updated_at, owner_id',
      { count: 'exact' },
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (tag) query = query.contains('tags', [tag])
  if (keyword) {
    const safe = keyword.replace(/[,()]/g, ' ')
    query = query.or(`title.ilike.*${safe}*,excerpt.ilike.*${safe}*`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  const total = count ?? 0
  return {
    posts: (data ?? []) as Post[],
    total,
    totalPages: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)),
  }
}

export async function serverGetPostBySlug(slug: string): Promise<Post | null> {
  const database = await db()
  const { data, error } = await database
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw error
  return (data as Post | null) ?? null
}

export async function serverGetAllTags(): Promise<{ tag: string; count: number }[]> {
  const database = await db()
  const { data, error } = await database
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

/** sitemap 需要全部已发布文章的 slug */
export async function serverGetAllSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const database = await db()
  const { data, error } = await database
    .from('posts')
    .select('slug, updated_at')
    .eq('status', 'published')
  if (error) throw error
  return (data ?? []) as { slug: string; updated_at: string }[]
}

export async function serverGetSiteProfile(): Promise<SiteProfile | null> {
  const database = await db()
  const { data, error } = await database
    .from('site_owner')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) return null
  return (data as SiteProfile | null) ?? null
}
