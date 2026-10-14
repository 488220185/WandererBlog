import Link from 'next/link'
import type { Post } from '@/lib/types'

/** 纯展示组件，服务端渲染 */
export function TagIndexView({ tags }: { tags: { tag: string; count: number }[] }) {
  const max = tags.reduce((m, t) => Math.max(m, t.count), 0) || 1

  return (
    <div className="container-page py-14">
      <header className="mb-10">
        <p className="font-mono text-xs text-accent/80">$ ls ./tags</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
          标签分类
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
          文章按技术主题打标签。点任意标签可以看到该主题下的全部文章。
        </p>
      </header>

      {tags.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-400">还没有任何标签</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="card group relative overflow-hidden px-5 py-4 transition-all hover:border-accent/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-medium text-slate-200 transition-colors group-hover:text-accent">
                  #{tag}
                </span>
                <span className="font-mono text-xs text-slate-500">{count} 篇</span>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/50 to-accent transition-all duration-500"
                  style={{ width: `${Math.max(12, (count / max) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function TagDetailView({ tag, posts }: { tag: string; posts: Post[] }) {
  return (
    <div className="container-page py-14">
      <nav className="mb-6 flex items-center gap-2 font-mono text-xs text-slate-600">
        <Link href="/" className="hover:text-accent">
          home
        </Link>
        <span>/</span>
        <Link href="/tags" className="hover:text-accent">
          tags
        </Link>
        <span>/</span>
        <span className="text-slate-500">{tag}</span>
      </nav>

      <header className="mb-9">
        <h1 className="font-mono text-3xl font-black tracking-tight text-accent sm:text-4xl">
          #{tag}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          共 {posts.length} 篇文章 ·{' '}
          <Link href="/tags" className="text-cyan hover:underline">
            返回全部标签
          </Link>
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="card px-6 py-16 text-center text-sm text-slate-400">
          这个标签下还没有文章
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.slug}`}
              className="card group block p-6 transition-all hover:border-accent/40"
            >
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                <time dateTime={p.created_at}>{p.created_at.slice(0, 10)}</time>
                <span className="text-ink-600">/</span>
                <span className="text-cyan/80">{p.reading_minutes} min read</span>
              </div>
              <h2 className="mt-3 text-lg font-bold leading-snug text-slate-100 transition-colors group-hover:text-accent">
                {p.title}
              </h2>
              {p.excerpt && (
                <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
                  {p.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
