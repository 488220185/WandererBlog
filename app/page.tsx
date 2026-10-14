import Link from 'next/link'
import PostCard from '@/components/PostCard'
import { serverListPosts, serverGetAllTags, serverGetSiteProfile } from '@/lib/api-server'
import { SITE_NAME } from '@/lib/brand'
import { POSTS_PER_PAGE } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  tag?: string
  q?: string
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const tag = sp.tag?.trim() || undefined
  const q = sp.q?.trim() || undefined

  // 任一数据源失败都不应让整页 500：降级为空列表并保留可读提示
  let loadError: string | null = null
  const [list, tags, profile] = await Promise.all([
    serverListPosts({ page, tag, keyword: q }).catch((e: unknown) => {
      loadError = e instanceof Error ? e.message : String(e)
      return { posts: [], total: 0, totalPages: 1 }
    }),
    serverGetAllTags().catch(() => []),
    serverGetSiteProfile().catch(() => null),
  ])

  const title = profile?.blog_title ?? SITE_NAME
  const subtitle = profile?.blog_subtitle ?? '写代码，也写踩过的坑'
  const bio =
    profile?.author_bio ??
    '前端与全栈开发者。这里存放我在真实项目里踩过的坑、以及验证过的解法，尽量把「为什么这么做」讲清楚。'

  // 站内搜索用 GET 表单，URL 可分享、可收藏，爬虫也能理解分页结构
  const qs = (p: number) => {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const s = params.toString()
    return s ? `/?${s}` : '/'
  }

  return (
    <div>
      <section className="container-page pb-12 pt-14 sm:pt-20">
        <div className="animate-fade-up">
          <div className="mb-5 flex items-center gap-2 font-mono text-xs text-accent/80">
            <span className="inline-block h-2 w-2 animate-blink rounded-full bg-accent" />
            <span>{subtitle}</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-[1.15] tracking-tight text-slate-50 sm:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">{bio}</p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <div className="flex gap-6">
              <Stat value={list.total} label="篇文章" />
              <Stat value={tags.length} label="个标签" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/tags" className="btn-ghost text-xs">
                浏览标签
              </Link>
              <Link href="/about" className="btn-ghost text-xs">
                关于我
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page pb-4">
        <div className="flex flex-col gap-4 border-y border-ink-700/70 py-5 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="标签筛选">
            <Link
              href={q ? `/?q=${encodeURIComponent(q)}` : '/'}
              className={`chip !px-3 !py-1.5 ${!tag ? 'chip-active' : ''}`}
            >
              全部
            </Link>
            {tags.map(({ tag: t, count }) => (
              <Link
                key={t}
                href={
                  qs(1).startsWith('/?')
                    ? `${qs(1)}&tag=${encodeURIComponent(t)}`
                    : `/?tag=${encodeURIComponent(t)}`
                }
                className={`chip !px-3 !py-1.5 ${tag === t ? 'chip-active' : ''}`}
              >
                #{t}
                <span className="text-slate-600">{count}</span>
              </Link>
            ))}
          </nav>

          <form action="/" method="get" className="flex w-full gap-2 md:w-72">
            {tag && <input type="hidden" name="tag" value={tag} />}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder="搜索标题或摘要…"
              className="field !py-2 text-xs"
              aria-label="搜索文章"
            />
            <button type="submit" className="btn-ghost shrink-0 !px-3 !py-2 text-xs">
              搜索
            </button>
          </form>
        </div>
      </div>

      <div className="container-page pt-8">
        {loadError && (
          <div className="card mb-6 border-amber-600/50 bg-amber-950/20 p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-amber-400">
              数据加载失败
            </p>
            <p className="mt-2 break-words text-sm leading-relaxed text-slate-300">
              {loadError}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              若提示缺少 Supabase 配置，请检查 Vercel 项目的环境变量是否已按
              <code className="mx-1 font-mono text-cyan">NEXT_PUBLIC_</code>
              前缀命名，并在改动后重新部署。
            </p>
          </div>
        )}

        {list.posts.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="font-mono text-3xl text-slate-700">~/</span>
            <p className="text-sm text-slate-400">
              {q || tag ? '没有匹配的文章，换个条件试试' : '还没有文章'}
            </p>
            <Link href="/login" className="btn-primary mt-1 text-xs">
              登录后开始写作
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.posts.map((p) => (
              <PostCard key={p.id} post={p} highlight={tag ? [tag] : []} />
            ))}
          </div>
        )}

        {list.totalPages > 1 && (
          <nav
            className="mt-10 flex items-center justify-center gap-3"
            aria-label="分页导航"
          >
            {page > 1 ? (
              <Link href={qs(page - 1)} className="btn-ghost !py-1.5 text-xs" rel="prev">
                ← 上一页
              </Link>
            ) : (
              <span className="btn-ghost !py-1.5 text-xs opacity-40">← 上一页</span>
            )}
            <span className="font-mono text-xs text-slate-500">
              {page} / {list.totalPages}
            </span>
            {page < list.totalPages ? (
              <Link href={qs(page + 1)} className="btn-ghost !py-1.5 text-xs" rel="next">
                下一页 →
              </Link>
            ) : (
              <span className="btn-ghost !py-1.5 text-xs opacity-40">下一页 →</span>
            )}
          </nav>
        )}
      </div>

      {/* 兜底导航：给爬虫一条无需 JS 的文章发现路径 */}
      <div className="container-page mt-12">
        <h2 className="sr-only">全部文章</h2>
        <ul className="space-y-1.5">
          {list.posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/posts/${p.slug}`}
                className="text-sm text-slate-400 underline-offset-4 hover:text-accent hover:underline"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-2xl font-bold text-slate-100">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  )
}
