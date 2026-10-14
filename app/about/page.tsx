import type { Metadata } from 'next'
import Link from 'next/link'
import { serverGetAllTags, serverGetSiteProfile, serverListPosts } from '@/lib/api-server'
import { SITE_DESCRIPTION, SITE_NAME, SITE_SUBTITLE } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '关于',
  description: `关于${SITE_NAME}：博主介绍、技术栈、写作原则与站点数据。${SITE_DESCRIPTION}`,
  alternates: { canonical: '/about' },
  openGraph: {
    title: `关于 · ${SITE_NAME}`,
    description: `关于${SITE_NAME}：博主介绍、技术栈与写作原则。`,
    url: '/about',
  },
}

const STACK = [
  { group: '前端', items: ['React 19', 'Next.js 15', 'TypeScript', 'Tailwind CSS', 'TanStack Query'] },
  { group: '后端', items: ['Node.js', 'PostgreSQL', 'REST / PostgREST', 'Row Level Security'] },
  { group: '工程', items: ['Docker Compose', 'Git', 'CI/CD', '云原生部署'] },
  { group: '在折腾', items: ['边缘计算', '本地优先应用', 'AI 辅助开发流'] },
]

const TOPICS = [
  {
    title: '写清楚「为什么」',
    body: '大部分技术博客只贴一段能跑的代码。我更想把踩坑时的判断依据写下来——当时排除了哪些方案、为什么选了这个、下次遇到该怎么判断。',
  },
  {
    title: '只写验证过的',
    body: '没在真实项目里跑过的方案我不会写进文章。宁可文章少一点，也不想给你一个看起来对、实际会踩坑的答案。',
  },
  {
    title: '代码即文档',
    body: '每篇都尽量给可运行的最小示例和关键配置，而不是伪代码。示例会尽量短，但完整到能直接复制验证。',
  },
]

export default async function AboutPage() {
  const [profile, list, tags] = await Promise.all([
    serverGetSiteProfile().catch(() => null),
    serverListPosts({ page: 1 }).catch(() => ({ posts: [], total: 0, totalPages: 1 })),
    serverGetAllTags().catch(() => []),
  ])

  const recent = list.posts
  const author = profile?.author_name ?? '流浪者'
  const bio =
    profile?.author_bio ??
    '前端与全栈开发者，习惯把踩过的坑整理成文档。关注 React 生态、数据库性能与工程效率。'
  const title = profile?.blog_title ?? SITE_NAME

  return (
    <div className="container-page py-14">
      <header className="mb-12">
        <p className="font-mono text-xs text-accent/80">$ cat ./about.md</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">关于</h1>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <section className="card p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-accent/40 bg-accent-soft font-mono text-lg font-bold text-accent">
                {author.slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{author}</h2>
                <p className="font-mono text-xs text-slate-500">
                  {title} · {list.total > 0 ? `${list.total} 篇文章` : '持续更新中'}
                </p>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-[1.85] text-slate-400">{bio}</p>
          </section>

          <section>
            <h2 className="mb-5 font-mono text-xs uppercase tracking-wider text-slate-500">
              这个博客怎么写
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {TOPICS.map((t) => (
                <div key={t.title} className="card p-5">
                  <h3 className="text-sm font-bold text-accent">{t.title}</h3>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-slate-400">{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-5 font-mono text-xs uppercase tracking-wider text-slate-500">
              技术栈
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {STACK.map((s) => (
                <div key={s.group} className="card p-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-100">{s.group}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {s.items.map((i) => (
                      <span key={i} className="chip">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">站点数据</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">文章总数</dt>
                <dd className="font-mono text-slate-200">{list.total}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">标签数量</dt>
                <dd className="font-mono text-slate-200">{tags.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">正文格式</dt>
                <dd className="font-mono text-slate-200">Markdown</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">存储</dt>
                <dd className="font-mono text-slate-200">云数据库 + 云存储</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">副标题</dt>
                <dd className="font-mono text-slate-200">{profile?.blog_subtitle ?? SITE_SUBTITLE}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">最近更新</h2>
            <ul className="mt-4 space-y-3">
              {recent.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/posts/${p.slug}`}
                    className="link-underline block text-[13px] leading-snug text-slate-300 hover:text-accent"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
              {recent.length === 0 && <li className="text-xs text-slate-600">暂无文章</li>}
            </ul>
          </section>

          <section className="card border-accent/25 bg-accent-soft/30 p-6">
            <h2 className="text-sm font-bold text-accent">想写一篇？</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
              注册账号后就能用 Markdown 写文章，配图和附件会存到云端。
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/login" className="btn-primary flex-1 text-xs">
                登录 / 注册
              </Link>
              <Link href="/" className="btn-ghost text-xs">
                去看看
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
