import type { MetadataRoute } from 'next'
import { serverGetAllSlugs, serverGetAllTags } from '@/lib/api-server'
import { SITE_URL } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export default async function Sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // 固定页面
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tags`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  let posts: { slug: string; updated_at: string }[] = []
  let tags: { tag: string }[] = []
  try {
    ;[posts, tags] = await Promise.all([serverGetAllSlugs(), serverGetAllTags()])
  } catch {
    // 拿不到数据时至少输出固定页面，不让 sitemap 整个失败
  }

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/posts/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const tagRoutes: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${SITE_URL}/tags/${encodeURIComponent(t.tag)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...postRoutes, ...tagRoutes]
}
