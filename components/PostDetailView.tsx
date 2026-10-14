import Link from 'next/link'
import type { PostView } from '@/lib/types'
import { formatDate } from '@/lib/types'

/** 服务端渲染的文章正文。Markdown 在服务端转成 HTML，爬虫可直接读到全文。 */
export default function PostDetailView({ post }: { post: PostView }) {
  return (
    <article className="container-page py-12">
      <nav className="mb-8 flex items-center gap-2 font-mono text-xs text-slate-600">
        <Link href="/" className="hover:text-accent">
          home
        </Link>
        <span>/</span>
        <Link href="/tags" className="hover:text-accent">
          posts
        </Link>
        <span>/</span>
        <span className="truncate text-slate-500">{post.slug}</span>
      </nav>

      <header className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-500">
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          <span className="text-ink-600">/</span>
          <span className="text-cyan/80">{post.reading_minutes} min read</span>
          <span className="text-ink-600">/</span>
          <span className="text-slate-500">{post.views} 次阅读</span>
          {post.status === 'draft' && (
            <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300">草稿</span>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-50 sm:text-4xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 border-l-2 border-accent/40 pl-4 text-[15px] leading-relaxed text-slate-400">
            {post.excerpt}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-1.5 border-y border-ink-700/70 py-4">
          {(post.tags ?? []).map((t) => (
            <Link
              key={t}
              href={`/tags/${encodeURIComponent(t)}`}
              className="chip hover:chip-active"
            >
              #{t}
            </Link>
          ))}
        </div>
      </header>

      <div
        className="md-body mx-auto mt-10 max-w-3xl"
        dangerouslySetInnerHTML={{ __html: post.content_html }}
      />

      <div className="mx-auto mt-16 max-w-3xl border-t border-ink-700/70 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="btn-ghost text-xs">
            ← 返回全部文章
          </Link>
          <Link href={`/admin?edit=${post.id}`} className="btn-ghost text-xs">
            编辑这篇文章
          </Link>
        </div>

        {/* 相邻文章导航：为爬虫提供站内爬取路径 */}
        <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="继续阅读">
          {post.prev && (
            <Link
              href={`/posts/${post.prev.slug}`}
              className="card group px-4 py-3 transition-all hover:border-accent/40"
            >
              <div className="font-mono text-[10px] text-slate-600">← 上一篇</div>
              <div className="mt-1 text-sm text-slate-300 group-hover:text-accent">
                {post.prev.title}
              </div>
            </Link>
          )}
          {post.next && (
            <Link
              href={`/posts/${post.next.slug}`}
              className="card group px-4 py-3 text-right transition-all hover:border-accent/40"
            >
              <div className="font-mono text-[10px] text-slate-600">下一篇 →</div>
              <div className="mt-1 text-sm text-slate-300 group-hover:text-accent">
                {post.next.title}
              </div>
            </Link>
          )}
        </nav>
      </div>
    </article>
  )
}
