import type { Metadata } from 'next'
import './globals.css'
import SiteShell from '@/components/SiteShell'
import { SITE_DESCRIPTION, SITE_NAME, SITE_SUBTITLE, SITE_URL } from '@/lib/brand'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · ${SITE_SUBTITLE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ['技术博客', '前端', 'React', 'Next.js', 'PostgreSQL', 'Docker', '流浪者博客'],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_SUBTITLE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} · ${SITE_SUBTITLE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport = {
  themeColor: '#07090f',
  width: 'device-width',
  initialScale: 1,
}

/** 让爬虫执行 JS 才能拿到正文——对不支持 JS 的爬虫是明确降级信号 */
export const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  inLanguage: 'zh-CN',
  blogPost: {
    '@type': 'BlogPosting',
    headline: `${SITE_NAME} · ${SITE_SUBTITLE}`,
    description: SITE_DESCRIPTION,
    inLanguage: 'zh-CN',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
