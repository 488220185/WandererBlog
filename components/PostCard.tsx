import Link from 'next/link'
import type { Post } from '@/lib/types'
import { formatDate } from '@/lib/types'

export default function PostCard({
  post,
  highlight,
}: {
  post: Post
  highlight?: string[]
}) {
  const tags = post.tags ?? []
  const h = highlight ?? []

  return (
    <article className="card group relative overflow-hidden transition-all duration-200 hover:border-accent/40 hover:shadow-[0_0_40px_-18px_rgba(74,222,128,0.45)]">
      <Link href={`/posts/${post.slug}`} className="block p-6">
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          <span className="text-ink-600">/</span>
          <span className="text-cyan/80">{post.reading_minutes} min read</span>
          {post.status === 'draft' && (
            <>
              <span className="text-ink-600">/</span>
              <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300">草稿</span>
            </>
          )}
        </div>

        <h2 className="mt-3 text-lg font-bold leading-snug text-slate-100 transition-colors group-hover:text-accent">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
            {post.excerpt}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className={`chip ${h.includes(t) ? 'chip-active' : ''}`}>
              #{t}
            </span>
          ))}
        </div>
      </Link>

      <span className="pointer-events-none absolute right-5 top-5 font-mono text-xs text-slate-700 transition-all duration-200 group-hover:right-4 group-hover:text-accent/60">
        →
      </span>
    </article>
  )
}
