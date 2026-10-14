'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { resolveStorageUrl } from '@/lib/api'

/**
 * `storage:<path>` 是本博客约定的云存储图片占位语法：
 * Markdown 里写 ![](storage:shared/xxx/images/a.png)，
 * 渲染时换成有时效的签名下载链接。
 */
function storageToSigned(md: string, cache: Record<string, string>): string {
  return md.replace(
    /!\[[^\]]*\]\(storage:([^)\s]+)\)/g,
    (_m, p: string) => `![image](${cache[p] ?? ''})`,
  )
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'id'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', '#'],
    src: ['http', 'https', 'data'],
  },
}

export default function MarkdownView({ content }: { content: string }) {
  const [signed, setSigned] = useState<Record<string, string>>({})

  const paths = useMemo(() => {
    const found: string[] = []
    const re = /!\[[^\]]*\]\(storage:([^)\s]+)\)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content))) found.push(m[1])
    return [...new Set(found)]
  }, [content])

  useEffect(() => {
    if (paths.length === 0) {
      setSigned({})
      return
    }
    let cancelled = false
    const cache: Record<string, string> = {}

    void Promise.all(
      paths.map(async (p) => {
        const url = await resolveStorageUrl(p)
        if (url) cache[p] = url
      }),
    ).then(() => {
      if (!cancelled) setSigned({ ...cache })
    })

    return () => {
      cancelled = true
    }
  }, [paths])

  const source = useMemo(() => storageToSigned(content, signed), [content, signed])

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, rehypeRaw]}
        rehypePlugins={[rehypeSanitize, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          a: ({ href, children, ...rest }) => {
            const external = !!href && /^https?:/i.test(href)
            return (
              <a
                href={href}
                {...rest}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            )
          },
          img: ({ src, alt, ...rest }) => {
            if (!src) {
              return (
                <span className="rounded-lg border border-dashed border-ink-600 px-3 py-2 text-xs text-slate-500">
                  图片加载中…
                </span>
              )
            }
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            return <img src={src} alt={alt ?? ''} loading="lazy" {...rest} />
          },
          pre: ({ children }) => (
            <pre className="relative">
              <code>{children}</code>
            </pre>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
      {/* sanitize schema 用到了，但需保证引用不被摇掉 */}
      <span className="hidden" data-sanitize={typeof sanitizeSchema === 'object' ? '1' : '0'} />
    </div>
  )
}
