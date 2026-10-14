/**
 * 云服务关键路径验证脚本。
 * 在发布域名下运行，检查：匿名读文章、匿名写被拒、RPC 可调用。
 * 用法：node scripts/verify-cloud.mjs
 */
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

const ENDPOINT = 'https://dev-notes-blog-23897.app.workbuddy.host'
const PUBLISHABLE_KEY =
  'wbpk_D2sZRRlKM1e4roUd642xwo_RGyJ5ws5fCD5WYj9LUelJNoiEtf7C2gY'
const OAUTH_RELAY = 'https://www.workbuddy.cn/v2/as/genie-baas/oauth'

const cloud = createWorkBuddyCloud({
  endpoint: ENDPOINT,
  oauthRelayBaseUrl: OAUTH_RELAY,
  publishableKey: PUBLISHABLE_KEY,
})

let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

async function main() {
  // 1. 匿名读取已发布文章（RLS 公开读）
  const { data: posts, error: readErr } = await cloud.database
    .from('posts')
    .select('id, slug, title, tags, reading_minutes')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  check('匿名读取已发布文章', !readErr && (posts?.length ?? 0) >= 4,
    readErr ? readErr.message : `读到 ${posts?.length ?? 0} 篇`)

  // 2. 标签聚合
  const allTags = new Set((posts ?? []).flatMap((p) => p.tags ?? []))
  check('标签聚合', allTags.size >= 6, `${allTags.size} 个标签`)

  // 3. 匿名写入必须被 RLS 拒绝
  const { data: hacked, error: writeErr } = await cloud.database
    .from('posts')
    .insert({ title: 'hack', slug: `hack-${Date.now()}`, content_md: 'x', tags: [], status: 'published' })
    .select()

  check('匿名写入被 RLS 拒绝', !!writeErr || (hacked?.length ?? 0) === 0,
    writeErr ? `错误码 ${writeErr.code ?? writeErr.message}` : '被策略静默过滤')

  // 4. 未登录不能上传文件
  const session = await cloud.auth.getSession()
  check('未登录无会话', !session.data,
    session.error ? session.error.message : '确认无会话')

  // 5. 浏览量自增 RPC（SECURITY DEFINER，匿名可调用）
  const slug = posts?.[0]?.slug
  if (slug) {
    const { data: bumped, error: rpcErr } = await cloud.database.rpc('bump_post_view', { p_slug: slug })
    check('浏览量自增 RPC', !rpcErr && bumped === 1, rpcErr ? rpcErr.message : `影响 ${bumped} 行`)
  }

  // 6. 站点信息表可读
  const { data: owner, error: ownerErr } = await cloud.database
    .from('site_owner')
    .select('uid, blog_title')
    .limit(1)
    .maybeSingle()

  check('站点信息表可读', !ownerErr, ownerErr ? ownerErr.message : owner?.blog_title ?? '尚无人认领（首个注册用户将成为博主）')

  console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项未通过`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('验证脚本异常：', e)
  process.exit(1)
})
