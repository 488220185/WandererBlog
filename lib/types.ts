export type PostStatus = 'published' | 'draft'

export interface Post {
  id: number
  owner_id: string
  title: string
  slug: string
  excerpt: string | null
  content_md: string
  cover_url: string | null
  tags: string[]
  status: PostStatus
  views: number
  reading_minutes: number
  created_at: string
  updated_at: string
}

/** 服务端渲染用的文章视图：正文已转成 HTML，并附带相邻文章 */
export interface PostView extends Post {
  content_html: string
  prev: { slug: string; title: string } | null
  next: { slug: string; title: string } | null
}

export interface SiteProfile {
  id: number
  uid: string
  owner_email: string | null
  blog_title: string
  blog_subtitle: string
  author_name: string
  author_bio: string
}

export interface Attachment {
  name: string
  path: string
  size: number
  contentType: string
}

export const POSTS_PER_PAGE = 6

/** 从 Markdown 正文里提取纯文本，用于自动生成摘要和计算阅读时长 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildExcerpt(md: string, max = 120): string {
  const text = stripMarkdown(md)
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** 按中文阅读速度约 400 字/分钟估算 */
export function estimateReadingMinutes(md: string): number {
  const text = stripMarkdown(md)
  return Math.max(1, Math.round(text.length / 400))
}

/** 把标题转成 URL 友好的 slug，中文保留原字符 */
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  const ascii = base.replace(/[^a-z0-9-]/g, '')
  if (ascii.length >= 3) return ascii.slice(0, 60)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
