import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export default function Robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 后台与登录页没有收录价值，也不该进索引
        disallow: ['/admin', '/login', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
