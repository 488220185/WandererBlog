# 项目长期记忆

## 项目：流浪者博客（个人技术博客）

线上地址：https://dev-notes-blog-23897.app.workbuddy.host/
应用 ID：`wbapp_D2sZRRlKM1e4roUd642xwo`

### 架构
Next.js 15 App Router + React 19 + Tailwind 3，数据在 WorkBuddy 云服务（PostgreSQL + 云存储 + 认证）。
读路径服务端渲染（RSC），写路径客户端。

### 目录职责
| 路径 | 职责 |
|---|---|
| `lib/brand.ts` | **站点品牌信息唯一来源**，改博客名/域名只需改这里或环境变量 |
| `lib/backend.ts` | **后端适配层**：按 `NEXT_PUBLIC_BACKEND` 切换 workbuddy / supabase |
| `lib/cloud.ts` | 云服务代理（Proxy 转发到 backend.ts），业务代码统一从这里拿 `cloud` |
| `lib/cloud-config.ts` | WorkBuddy publicConfig（endpoint / publishableKey / oauthRelayBaseUrl） |
| `lib/api.ts` | 客户端数据访问：写操作、鉴权查询、文件上传 |
| `lib/api-server.ts` | 服务端只读（无会话），供 RSC 使用 |
| `lib/markdown-server.ts` | 服务端 Markdown → HTML |
| `lib/types.ts` | 类型 + 工具函数（摘要提取、阅读时长、slug 生成） |
| `lib/database.types.ts` | WorkBuddy 数据库 schema 类型，SDK 泛型必需 |
| `supabase/schema.sql` | 建表 + 函数 |
| `supabase/rls.sql` | RLS 策略（**所有写策略必须带 `is_signed_in()`**） |
| `supabase/check.sql` | 建表自检（8 项数字） |
| `supabase/seed.sql` | 4 篇文章的 INSERT，SQL Editor 直接执行 |
| `scripts/gen-seed-sql.py` | 从 seed/posts.json 生成 seed.sql，含语法校验 |
| `supabase/*.sql` | Supabase 建表与 RLS 脚本 |
| `seed/posts.json` | 文章迁移种子（**必须提交版本库**，勿加 .gitignore） |

### 双后端架构
`NEXT_PUBLIC_BACKEND=workbuddy`（默认，零配置）或 `supabase`（Vercel 自部署）。
业务代码只依赖 `lib/cloud.ts` 暴露的 `cloud`，切换后端无需改业务逻辑。

已知差异：Supabase 后端**未接文件存储**、**无微信登录**。

### 约定
- **改品牌名/副标题/域名**：只改 `lib/brand.ts`
- **加数据库表或改 RLS**：必须显式带 `is_signed_in()`，见下条
- **加页面**：服务端组件优先；确实需要交互时拆出小的客户端子组件，不要整页 `'use client'`
- **SEO**：每个页面都要有 `alternates.canonical` 和 `generateMetadata`

### ⚠️ 云数据库 RLS 铁律

**两套环境 `auth.uid()` 行为不同，写 SQL 时必须兼容：**

| 环境 | 返回类型 | 未登录时 |
|---|---|---|
| WorkBuddy 云服务 | `text` | 字符串 `'anon'`（不是 NULL） |
| Supabase | `uuid` | NULL |

**坑 1 · 权限绕过**：WorkBuddy 下 `owner_id = auth.uid()` 会让匿名访客匹配到 `owner_id='anon'` 的行（默认值正好是 'anon'），从而能写入数据。所有写策略必须带 `is_signed_in()`：

```sql
is_signed_in() AND (owner_id = auth.uid()::text OR EXISTS (SELECT 1 FROM site_owner WHERE uid = auth.uid()::text))
```

**坑 2 · 类型错误 22P02**：Supabase 的 `auth.uid()` 是 uuid 类型，写 `auth.uid() <> ''` 会报
`invalid input syntax for type uuid: ""`。**凡是和字符串比较，一律先 `::text`**：

```sql
-- ✅ 两边都能跑
CREATE OR REPLACE FUNCTION public.is_signed_in() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid()::text <> ''
     AND auth.uid()::text <> 'anon'
$$;
```

`IS NOT NULL` 不需要加 `::text`（NULL 判断不涉及类型转换）。
字段类型统一用 `TEXT`，默认值写 `auth.uid()::text`。

### 环境注意事项
- 云服务要求 **Origin 精确匹配**，localhost 本地跑不通数据面，必须在发布域名上验证
- `npm run build` 需要绕过沙箱（写 `.next/trace` 会 EPERM）
- **发布器扫 package.json 判定外部数据库依赖，装了 `pg` 驱动会被拒绝发布**。需要连数据库的运维脚本请走 REST API，别引驱动
- 验证脚本：`npm run verify:cloud`
- **本机没装独立 Node**，npm 在 `C:\Users\48822\.workbuddy\binaries\node\versions\22.22.2-6\`
- PowerShell 里 `npm` 可能报"禁止运行脚本"，用 `npm.cmd` 或 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- 给用户的示例命令里带中文占位符（"你的密钥"）会被原样执行导致怪异报错，尽量避免

### 站点归属机制
`site_owner` 表单行（id=1）。首个登录/注册的用户自动写入该表，成为"博主本人"，
可编辑全部文章（含示例文章）与站点标题。后续用户只能管理自己写的文章。
