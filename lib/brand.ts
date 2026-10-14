/** 站点品牌信息。改博客名只需改这里。 */
export const SITE_NAME = '流浪者博客'
export const SITE_SUBTITLE = '写代码，也写踩过的坑'
export const SITE_AUTHOR = '流浪者'
export const SITE_DESCRIPTION =
  '一个技术向个人博客：前端框架、后端数据库、DevOps 与踩坑记录。Markdown 写作，代码高亮。'

/**
 * 站点地址。
 * 优先读 NEXT_PUBLIC_SITE_URL（部署到 Vercel / 自有域名时在环境变量里配），
 * 没配则回落到当前平台域名。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dev-notes-blog-23897.app.workbuddy.host'
).replace(/\/$/, '')

