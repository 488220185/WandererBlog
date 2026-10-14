# 流浪者博客 · 部署指南

个人技术博客，Next.js 15 + React 19 + Tailwind CSS，支持服务端渲染与完整 SEO。

项目支持**两种数据后端**，通过环境变量切换，业务代码完全一致：

| 后端 | 适用场景 | 登录 | 云存储 |
|---|---|---|---|
| `workbuddy`（默认） | 直接用当前线上环境，开箱即用 | 邮箱密码 / 验证码 / 微信 | ✅ 支持 |
| `supabase` | 部署到 Vercel + 自有域名 | 邮箱密码 / 验证码 | ❌ 未接入 |

---

## 一、部署到 Vercel 并绑定自有域名

### 步骤 1 · 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) → New project
2. 进入 **SQL Editor**，依次执行：
   - `supabase/schema.sql`（建表 + 函数）
   - `supabase/rls.sql`（行级安全策略）
3. 在 **Settings → Data Management** 添加一条 Storage bucket（如果需要图片上传）

> ⚠️ 必读：`supabase/rls.sql` 里每条写策略都带了 `is_signed_in()` 判断。
> 这是为了防止匿名访客写入数据——某些环境下未登录时 `auth.uid()` 返回
> 字符串 `'anon'` 而不是 NULL，直接写 `owner_id = auth.uid()` 会让匿名请求匹配上。
> 不要删掉这个判断。

### 步骤 2 · 导入现有文章

4 篇示例文章已导出到 `seed/posts.json`，用脚本导入（PowerShell）：

```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SECRET_KEY="sb_secret_..."
npm run seed:import
```

两个值都在 Supabase **Settings → API Keys** 里。脚本零额外依赖（直接调 REST API），
且是幂等的——重复执行不会产生重复文章。

也可以在 Supabase 的 Table Editor 里手动导入，或直接看 `seed/posts.json` 自查。

### 步骤 3 · 部署到 Vercel

1. 把代码推到 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com) → Add New → Project → 导入仓库
3. 在 **Environment Variables** 里配置：

| 变量 | 值 |
|---|---|
| `NEXT_PUBLIC_BACKEND` | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key（`sb_publishable_...`），旧项目填 anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://你的域名`（如未绑域名，先填 Vercel 默认域名） |

4. 点击 Deploy，等待构建完成

### 步骤 4 · 绑定自有域名

1. Vercel 项目 → **Settings → Domains** → Add
2. 输入你的域名，按提示在域名服务商处添加：
   - **A 记录**：`@` → `76.76.21.21`
   - **CNAME**：`www` → `cname.vercel-dns.com`
3. 等待 DNS 生效，Vercel 会自动签发 HTTPS 证书

### 步骤 5 · 同步站点地址

域名生效后，把 `NEXT_PUBLIC_SITE_URL` 改成正式域名并重新部署。
这个值影响 `sitemap.xml`、`canonical` 和 Open Graph，务必改成正式域名。

### 步骤 6 · 提交搜索引擎收录

```
https://你的域名/sitemap.xml
```

- Google：[Search Console](https://search.google.com/search-console) → 提交 sitemap
- 百度：搜索资源平台 → 提交 sitemap

---

## 二、继续使用 WorkBuddy 后端

不需要任何额外配置，保持默认即可：

```bash
npm install
npm run build
npm start
```

数据存放在 WorkBuddy 云服务，图片附件走云存储，登录支持微信扫码。

---

## 三、本地开发

```bash
npm install

# 复制环境变量（默认走 WorkBuddy，可不配）
cp .env.example .env.local

npm run dev
```

启动后访问 http://localhost:3000

> 注意：WorkBuddy 后端要求请求 Origin 精确匹配，**localhost 下无法正常访问数据**，
> 会看到加载失败。要在本地验证完整功能，请用 Supabase 后端，或部署后访问线上域名。

---

## 四、常用脚本

| 命令 | 作用 |
|---|---|
| `npm run verify:cloud` | 验证云服务关键路径（匿名读、写拒绝、RPC、会话） |
| `npm run seed:export` | 从 WorkBuddy 导出文章为迁移种子 |
| `npm run seed:import`（需先设 SUPABASE_URL 与 SUPABASE_SECRET_KEY） | 把种子导入目标 Supabase |

---

## 五、目录结构

```
├── app/                  # 路由与页面
│   ├── page.tsx              # 文章列表（服务端渲染）
│   ├── posts/[slug]/        # 文章详情（SSR + JSON-LD）
│   ├── tags/                # 标签分类
│   ├── about/               # 关于
│   ├── admin/               # 写作台（需登录）
│   ├── login/               # 登录注册
│   ├── robots.ts            # robots.txt
│   └── sitemap.ts           # sitemap.xml
├── components/           # UI 组件
├── lib/
│   ├── brand.ts            # 站点名称/地址（改这里）
│   ├── backend.ts          # 后端适配层（WorkBuddy ↔ Supabase）
│   ├── api.ts              # 客户端数据访问（写操作、上传）
│   ├── api-server.ts       # 服务端只读（SSR 用）
│   ├── markdown-server.ts  # 服务端 Markdown → HTML
│   └── types.ts            # 类型与工具函数
├── supabase/             # 建表与 RLS 脚本
├── seed/posts.json       # 文章迁移种子
└── scripts/              # 运维脚本
```

## 六、站点归属机制

`site_owner` 表是单行表（`id=1`）。**首个登录的用户**会自动写入该表，
成为"博主本人"，可以编辑全部文章与站点标题；之后注册的用户只能管理自己写的文章。
