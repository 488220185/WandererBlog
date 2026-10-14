import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TagDetailView } from '@/components/TagViews'
import { serverListPosts } from '@/lib/api-server'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const { posts } = await serverListPosts({ tag: decoded })
  const desc =
    posts.length > 0
      ? `${SITE_NAME}中关于「${decoded}」的文章，共 ${posts.length} 篇：${posts
          .slice(0, 3)
          .map((p) => p.title)
          .join('、')}。`
      : `${SITE_NAME}的 ${decoded} 主题文章。`
  return {
    title: `#${decoded}`,
    description: desc,
    alternates: { canonical: `/tags/${encodeURIComponent(decoded)}` },
    openGraph: {
      title: `#${decoded} · ${SITE_NAME}`,
      description: desc,
      url: `/tags/${encodeURIComponent(decoded)}`,
    },
  }
}

export default async function TagPage({ params }: RouteParams) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const { posts } = await serverListPosts({ tag: decoded })
  return <TagDetailView tag={decoded} posts={posts} />
}
