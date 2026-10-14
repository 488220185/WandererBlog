'use client'

import { useEffect, useRef, useState } from 'react'
import { uploadAttachment, uploadImage, type PostInput } from '@/lib/api'
import { buildExcerpt, slugify } from '@/lib/types'

interface Props {
  initial?: Partial<PostInput> & { id?: number }
  onSubmit: (input: PostInput) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

export default function PostEditor({ initial, onSubmit, onCancel, submitting }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug)
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [excerptTouched, setExcerptTouched] = useState(!!initial?.excerpt)
  const [content, setContent] = useState(initial?.content_md ?? '')
  const [tagInput, setTagInput] = useState((initial?.tags ?? []).join(', '))
  const [status, setStatus] = useState<'published' | 'draft'>(initial?.status ?? 'published')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  const fileRef = useRef<HTMLInputElement>(null)
  const attachRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title))
  }, [title, slugTouched])

  useEffect(() => {
    if (!excerptTouched) setExcerpt(buildExcerpt(content))
  }, [content, excerptTouched])

  function insert(before: string, after = '', placeholder = '') {
    const ta = taRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(s + before.length, e + before.length)
    })
  }

  async function handleImage(file: File) {
    setError(null)
    setUploading('图片')
    try {
      const snippet = await uploadImage(file)
      setContent((c) => `${c}\n\n![${file.name}](${snippet})\n`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片上传失败')
    } finally {
      setUploading(null)
    }
  }

  async function handleAttachment(file: File) {
    setError(null)
    setUploading('附件')
    try {
      const a = await uploadAttachment(file)
      setContent((c) => `${c}\n\n[📎 ${a.name}](storage:${a.path})\n`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '附件上传失败')
    } finally {
      setUploading(null)
    }
  }

  async function submit() {
    setError(null)
    if (!title.trim()) {
      setError('请填写标题')
      return
    }
    if (content.trim().length < 20) {
      setError('正文太短了，至少写 20 个字')
      return
    }
    const tags = tagInput
      .split(/[,，\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 8)

    try {
      await onSubmit({
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        excerpt: excerpt.trim() || null,
        content_md: content,
        tags,
        status,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const TOOLS: [string, () => void][] = [
    ['H2', () => insert('## ', '', '小节标题')],
    ['H3', () => insert('### ', '', '子标题')],
    ['B', () => insert('**', '**', '加粗')],
    ['I', () => insert('*', '*', '斜体')],
    ['`', () => insert('`', '`', 'code')],
    ['```', () => insert('```ts\n', '\n```', 'code block')],
    ['```sql', () => insert('```sql\n', '\n```', 'SELECT * FROM ...')],
    ['> ', () => insert('> ', '', '引用')],
    ['- ', () => insert('- ', '', '列表项')],
    ['1. ', () => insert('1. ', '', '列表项')],
    ['| ', () => insert('| 列1 | 列2 |\n| --- | --- |\n| a | b |\n')],
    ['[link]', () => insert('[', '](https://)', '链接文字')],
    ['HR', () => insert('\n---\n')],
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
          className="field !py-3 text-lg font-bold"
        />

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-ink-700 bg-ink-900/60 p-2">
            {TOOLS.map(([label, fn]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                className="rounded border border-transparent px-2 py-1 font-mono text-[11px] text-slate-400 transition-colors hover:border-ink-600 hover:bg-ink-800 hover:text-accent"
              >
                {label}
              </button>
            ))}
            <span className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={() => setTab(tab === 'write' ? 'preview' : 'write')}
                className={`rounded px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  tab === 'preview'
                    ? 'bg-ink-800 text-accent'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'write' ? '预览' : '编辑'}
              </button>
            </span>
          </div>

          {tab === 'write' ? (
            <textarea
              ref={taRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={'用 Markdown 写正文…\n\n支持 ## 标题、**加粗**、`代码`、``` 代码块、表格、引用'}
              className="min-h-[520px] w-full resize-y bg-transparent p-5 font-mono text-[13px] leading-[1.8] text-slate-200 outline-none placeholder:text-slate-600"
            />
          ) : (
            <div className="min-h-[520px] p-6">
              <ArticlePreview content={content} />
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => void submit()} disabled={submitting || !!uploading} className="btn-primary">
            {submitting ? '保存中…' : initial?.id ? '更新文章' : '发布文章'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus(status === 'published' ? 'draft' : 'published')
            }}
            className="btn-ghost"
          >
            {status === 'published' ? '存为草稿' : '直接发布'}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">
            取消
          </button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            发布设置
          </h3>
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">链接 slug</label>
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugTouched(true)
                }}
                className="field !py-2 font-mono text-xs"
              />
              <p className="mt-1 font-mono text-[10px] text-slate-600">/posts/{slug || '…'}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-400">标签（逗号分隔，最多 8 个）</label>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="React, 性能优化"
                className="field !py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-slate-400">摘要</label>
              <textarea
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value)
                  setExcerptTouched(true)
                }}
                rows={3}
                className="field resize-none !py-2 text-xs leading-relaxed"
              />
              <p className="mt-1 text-[10px] text-slate-600">留空则自动从正文提取</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
              <span className="text-xs text-slate-400">状态</span>
              <span
                className={`chip ${
                  status === 'published' ? 'chip-active' : 'text-amber-300'
                }`}
              >
                {status === 'published' ? '已发布' : '草稿'}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            图片与附件
          </h3>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImage(f)
              e.target.value = ''
            }}
          />
          <input
            ref={attachRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleAttachment(f)
              e.target.value = ''
            }}
          />
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!!uploading}
              className="btn-ghost w-full text-xs"
            >
              {uploading === '图片' ? '上传中…' : '🖼 插入图片'}
            </button>
            <button
              type="button"
              onClick={() => attachRef.current?.click()}
              disabled={!!uploading}
              className="btn-ghost w-full text-xs"
            >
              {uploading === '附件' ? '上传中…' : '📎 上传附件'}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
            图片最大 5 MB，附件最大 20 MB。文件存到云端存储，插入正文时会自动生成引用。
          </p>
        </div>

        <div className="card p-5">
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            写作提示
          </h3>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-500">
            <li>· 代码块标明语言即可高亮，如 ```ts</li>
            <li>· 图片和附件需登录后上传</li>
            <li>· 草稿仅自己可见</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

function ArticlePreview({ content }: { content: string }) {
  const [Comp, setComp] = useState<null | React.ComponentType<{ content: string }>>(null)

  useEffect(() => {
    void import('./MarkdownView').then((m) => setComp(() => m.default))
  }, [])

  if (!Comp) {
    return <p className="text-xs text-slate-600">预览加载中…</p>
  }
  return <Comp content={content} />
}
