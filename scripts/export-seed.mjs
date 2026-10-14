/**
 * 把云数据库里的文章导出为迁移种子。
 * 一次性脚本：node scripts/export-seed.mjs > seed/posts.json
 */
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

const cloud = createWorkBuddyCloud({
  endpoint: 'https://dev-notes-blog-23897.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey:
    'wbpk_D2sZRRlKM1e4roUd642xwo_RGyJ5ws5fCD5WYj9LUelJNoiEtf7C2gY',
})

const { data, error } = await cloud.database
  .from('posts')
  .select('title, slug, excerpt, content_md, tags, status, reading_minutes, views, created_at, updated_at')
  .order('created_at', { ascending: true })

if (error) {
  console.error(error)
  process.exit(1)
}

const seed = (data ?? []).map((p) => ({
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  content_md: p.content_md,
  tags: p.tags ?? [],
  status: p.status ?? 'published',
  reading_minutes: p.reading_minutes ?? 1,
  views: p.views ?? 0,
  created_at: p.created_at,
  updated_at: p.updated_at,
}))

process.stdout.write(JSON.stringify(seed, null, 2))
