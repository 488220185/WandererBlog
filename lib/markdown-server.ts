/**
 * 服务端 Markdown → HTML。
 * 用与客户端一致的渲染管线，保证 SEO 抓到的正文和用户看到的一致。
 * 同样支持 storage:<path> 占位语法（服务端无签名链接时降级为占位图）。
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const schema = {
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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeStringify)

/**
 * 把 storage: 引用降级为可识别的占位。
 * 服务端不签发临时签名链接（那是客户端的活），这里保留路径供客户端水合。
 */
function neutralizeStorage(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\(storage:([^)\s]+)\)/g, (_m, alt: string, path: string) =>
      `![${alt || '云端图片'}](storage-image:${path})`,
    )
    .replace(/\[([^\]]*)\]\(storage:([^)\s]+)\)/g, (_m, label: string, path: string) =>
      `[${label || path.split('/').pop() || '附件'}](storage-file:${path})`,
    )
}

export async function renderMarkdown(md: string): Promise<string> {
  if (!md) return ''
  try {
    const file = await processor.process(neutralizeStorage(md))
    return String(file)
  } catch {
    // 渲染失败时退回转义纯文本，不让整页 500
    return `<p>${md.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</p>`
  }
}
