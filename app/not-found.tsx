import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-5 py-28 text-center">
      <span className="font-mono text-6xl font-black text-slate-800">404</span>
      <h1 className="text-xl font-bold text-slate-200">页面走丢了</h1>
      <p className="max-w-sm text-sm text-slate-500">
        这个地址下没有内容，可能是链接输错了，或者文章已被删除。
      </p>
      <div className="flex gap-2">
        <Link href="/" className="btn-primary text-xs">
          回到首页
        </Link>
        <Link href="/tags" className="btn-ghost text-xs">
          浏览标签
        </Link>
      </div>
    </div>
  )
}
