import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailView from '@/components/PostDetailView'
import { serverGetPostBySlug, serverListPosts } from '@/lib/api-server'
import { SITE_NAME, SITE_URL } from '@/lib/brand'
import { renderMarkdown } from '@/lib/markdown-server'
import type { PostView } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

async function buildView(slug: string): Promise<PostView | null> {
  const post = await serverGetPostBySlug(slug)
  if (!post) return null

  const content_html = await renderMarkdown(post.content_md)

  // 相邻文章：按发布时间排序，取前后各一篇
  const { posts } = await serverListPosts({ page: 1 })
  const idx = posts.findIndex((p) => p.id === post.id)
  const prev = idx >= 0 && posts[idx + 1] ? { slug: posts[idx + 1].slug, title: posts[idx + 1].title } : null
  const next = idx > 0 ? { slug: posts[idx - 1].slug, title: posts[idx - 1].title } : null

  return { ...post, content_html, prev, next }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const post = await serverGetPostBySlug(decoded)

  if (!post) {
    return { title: '文章不存在', robots: { index: false, follow: false } }
  }

  const title = post.title
  const description =
    post.excerpt ??
    `${post.title} —— ${SITE_NAME}的技术文章，阅读约 ${post.reading_minutes} 分钟。`
  const url = `/posts/${post.slug}`

  return {
    title,
    description,
    keywords: post.tags ?? [],
    authors: [{ name: SITE_NAME }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: `${title} · ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      tags: post.tags ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${SITE_NAME}`,
      description,
    },
  }
}

export default async function PostPage({ params }: RouteParams) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)

  let view: PostView | null = null
  try {
    view = await buildView(decoded)
  } catch {
    view = null
  }

  if (!view) notFound()

  // 结构化数据：帮助搜索引擎理解这是博客文章
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: view.title,
    description: view.excerpt ?? '',
    datePublished: view.created_at,
    dateModified: view.updated_at,
    inLanguage: 'zh-CN',
    keywords: (view.tags ?? []).join(','),
    wordCount: view.content_md.length,
    timeRequired: `PT${view.reading_minutes}M`,
    author: { '@type': 'Person', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/posts/${view.slug}`,
    },
    articleSection: view.tags?.[0] ?? '技术',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostDetailView post={view} />
    </>
  )
}
