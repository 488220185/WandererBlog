import type { Metadata } from 'next'
import { TagIndexView } from '@/components/TagViews'
import { serverGetAllTags } from '@/lib/api-server'
import { SITE_NAME } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '标签分类',
  description: `按技术主题浏览${SITE_NAME}的全部文章：前端、后端、数据库、DevOps 等主题分类。`,
  alternates: { canonical: '/tags' },
  openGraph: {
    title: `标签分类 · ${SITE_NAME}`,
    description: '按技术主题浏览全部文章。',
    url: '/tags',
  },
}

export default async function TagsPage() {
  const tags = await serverGetAllTags().catch(() => [])
  return <TagIndexView tags={tags} />
}
