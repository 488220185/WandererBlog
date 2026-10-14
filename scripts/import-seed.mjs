/**
 * 把 seed/posts.json 导入目标 Supabase 项目。
 *
 * 零额外依赖：直接调用 Supabase 的 PostgREST 接口，
 * 不需要安装 pg 驱动，也不依赖本地 PostgreSQL 客户端。
 *
 * 用法（PowerShell）：
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..."
 *   npm run seed:import
 *
 * 密钥在 Supabase → Settings → API Keys 里获取。
 * 新项目用 secret key（sb_secret_ 开头的那个），旧项目用 service_role（eyJ... 开头的 JWT）。
 * 两个都支持。
 *
 * ⚠️ 这是服务端密钥，能绕过 RLS 读取全库。只在本地执行，不要提交到版本库。
 *
 * 幂等：已存在同 slug 的文章会跳过。
 */

const url = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !secretKey) {
  console.error('缺少环境变量：')
  if (!url) console.error('  SUPABASE_URL')
  if (!secretKey) console.error('  SUPABASE_SECRET_KEY（或旧版 SUPABASE_SERVICE_ROLE_KEY）')
  process.exit(1)
}

const { readFile } = await import('node:fs/promises')
const posts = JSON.parse(
  await readFile(new URL('../seed/posts.json', import.meta.url), 'utf8'),
)

// 新式 secret key（sb_secret_）不是 JWT，不能放 Authorization: Bearer，
// 平台会尝试按 JWT 解析并报 Invalid JWT。只走 apikey 头两种格式都兼容。
const isJwt = secretKey.startsWith('eyJ')
const headers = {
  apikey: secretKey,
  ...(isJwt ? { Authorization: `Bearer ${secretKey}` } : {}),
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
}

console.log(`使用密钥格式：${isJwt ? 'service_role（JWT）' : 'secret key（新式）'}\n`)

// 1. 读取已有 slug
const existingRes = await fetch(`${url}/rest/v1/posts?select=slug`, { headers })
if (!existingRes.ok) {
  console.error('读取现有文章失败：', await existingRes.text())
  process.exit(1)
}
const taken = new Set((await existingRes.json()).map((r) => r.slug))

// 2. 逐篇插入
let inserted = 0
let skipped = 0

for (const p of posts) {
  if (taken.has(p.slug)) {
    console.log(`SKIP  ${p.slug}`)
    skipped++
    continue
  }

  const res = await fetch(`${url}/rest/v1/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
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
    }),
  })

  if (res.ok) {
    console.log(`OK    ${p.slug}`)
    inserted++
  } else {
    console.error(`FAIL  ${p.slug}:`, await res.text())
  }
}

console.log(`\n完成：新增 ${inserted} 篇，跳过 ${skipped} 篇`)
