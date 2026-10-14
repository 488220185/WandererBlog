-- ============================================================
-- 流浪者博客 · 文章导入（4 篇）
-- 在 Supabase SQL Editor 里整段粘贴执行
--
-- owner_id 固定为 system：SQL Editor 没有登录态，auth.uid() 会返回 NULL，
-- 撞上非空约束报错。填一个占位身份即可；正式登录用户写文章时，
-- 数据库会自动填入其真实 uid。
--
-- 用 ON CONFLICT DO NOTHING 保证重复执行不会报错。
-- ============================================================

-- 为什么我不再用 Redux：状态管理的取舍
INSERT INTO posts (owner_id, title, slug, excerpt, content_md, tags, status, reading_minutes, created_at, updated_at)
VALUES (
  'system',
  '为什么我不再用 Redux：状态管理的取舍',
  'why-i-stopped-using-redux',
  '当一个状态库膨胀到需要你记住它的全部 API 时，它就该被拆掉了。这篇文章记录我在三个项目里的取舍过程。',
  '> 前端状态管理是所有技术方案里最容易被过度设计的一块。

## 起点：一个 Store 承载了所有状态

最早的那个项目里，我用 Redux 管了这些东西：

```ts
interface RootState {
  user: User | null
  posts: Post[]
  postsLoading: boolean
  postsError: string | null
  filters: { tag: string; keyword: string }
  ui: { sidebarOpen: boolean; theme: string }
  socket: { connected: boolean; lastPing: number }
}
```

问题不在 Redux 本身，而在于**所有状态被拍平进同一棵树**。结果是：

- 改一个筛选条件，要担心 `postsLoading` 是不是被别处改过
- 想查"用户信息在哪"，得全局搜索 `state.user`
- 新人上手要背 30 个 action type

## 三个替代方案的实测

### 1. 服务端状态 → TanStack Query

用户信息、文章列表这类**会过期、会缓存、会重试**的状态，本质上不属于客户端。

```ts
const { data, isPending, error } = useQuery({
  queryKey: ["posts", filters],
  queryFn: () => fetchPosts(filters),
  staleTime: 60_000,
})
```

自动失效、请求去重、乐观更新、重试策略，SDK 全包了。自己写一遍要三百行。

### 2. 客户端 UI 状态 → Context + useReducer

真正需要跨组件共享的 UI 状态其实很少。用 Context 就够：

```tsx
const SidebarContext = createContext<SidebarState | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ open, setOpen }), [open])
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
```

如果状态之间有复杂依赖，用 `useReducer` 把 reducer 提到单独文件里单测，比 dispatch 到处飞要好维护。

### 3. 表单与页面级状态 → URL

筛选条件、搜索词、页码 —— 这些东西**天生属于 URL**。

```ts
router.push(`?tag=${tag}&q=${keyword}&page=${page}`)
```

好处立刻就来：刷新不丢、能分享、能后退。

## 最终的目录结构

```
src/
  server/        # TanStack Query hooks + API 封装
  components/   # 纯展示
  ui/            # Context providers（主题、侧栏）
  routes/        # URL 参数解析
```

Redux 我现在只在两种场景用：**跨端离线同步队列**、**复杂工作流状态机**。其余一律不上。

## 一点体会

选择状态管理方案时，先问一句：**这个状态失效的时候，我希望谁去管它？**

- 失效由后端决定 → Query
- 失效由用户操作决定 → Context / URL
- 需要离线可用、需要事务 → 才考虑 Redux / XState

想清楚归属，方案基本就自己浮出来了。',
  ARRAY['React', '状态管理', '前端架构']::text[],
  'published',
  6,
  '2026-10-09T18:56:19.640581+08:00',
  '2026-10-09T18:56:19.640581+08:00'
) ON CONFLICT (slug) DO NOTHING;

-- PostgreSQL 索引失效的四种典型场景
INSERT INTO posts (owner_id, title, slug, excerpt, content_md, tags, status, reading_minutes, created_at, updated_at)
VALUES (
  'system',
  'PostgreSQL 索引失效的四种典型场景',
  'postgres-index-pitfalls',
  '索引建了却没走，比不建还糟——因为它会让写入变慢。我整理了生产环境里真实遇到过的四类索引失效。',
  '> 索引不是越多越好。写错的索引会让planner 放弃更优的执行计划，性能反而倒退。

## 一、对列做函数运算

```sql
-- ❌ 索引失效
SELECT * FROM users WHERE date(created_at) = ''2026-01-01'';

-- ✅ 改成范围查询，索引可用
SELECT * FROM users
WHERE created_at >= ''2026-01-01'' AND created_at < ''2026-01-02'';
```

PostgreSQL 有时会为表达式建隐式索引，但那是"另一个索引"，不是你想用的那个。

## 二、前导模糊查询

```sql
-- ❌ B-tree 索引完全用不上
SELECT * FROM posts WHERE title LIKE ''%缓存%'';

-- ✅ 全文检索
SELECT * FROM posts
WHERE to_tsvector(''simple'', title) @@ plainto_tsquery(''缓存'');
```

对中文场景，可以配合分词扩展，或者退一步用 `pg_trgm`：

```sql
CREATE INDEX idx_posts_title_trgm ON posts USING gin (title gin_trgm_ops);
```

三字符以上的中文子串匹配，这个索引能扛住。

## 三、隐式类型转换

```sql
-- ❌ varchar 列和数字比较，索引失效
SELECT * FROM orders WHERE order_no = 12345;

-- ✅ 类型对齐
SELECT * FROM orders WHERE order_no = ''12345'';
```

这个坑尤其阴险，因为它在开发环境（H2 / SQLite）可能表现正常，一到 PostgreSQL 就慢几十倍。

## 四、统计信息过期

```sql
-- 大量写入后手动刷新
ANALYZE posts;

-- 或调整采样精度
ALTER TABLE posts ALTER COLUMN status SET STATISTICS 1000;
```

autovacuum 没跟上时，planner 会用错误的行数估算走错计划。这类"昨天还好好的"的问题，八成是它。

## 排查手法

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM posts WHERE status = ''published'';
```

看两个地方：`Seq Scan` 出现在哪里，以及估算行数和实际行数差多少。差一个数量级以上，就是统计信息的问题。

## 一句话总结

> 建索引前先问：planner 在什么查询形态下会选它？把那个形态用真实数据 EXPLAIN 一遍。',
  ARRAY['PostgreSQL', '数据库', '性能优化']::text[],
  'published',
  7,
  '2026-10-09T18:56:29.384126+08:00',
  '2026-10-09T18:56:29.384126+08:00'
) ON CONFLICT (slug) DO NOTHING;

-- 用 Docker Compose 搭建一套干净的本地开发环境
INSERT INTO posts (owner_id, title, slug, excerpt, content_md, tags, status, reading_minutes, created_at, updated_at)
VALUES (
  'system',
  '用 Docker Compose 搭建一套干净的本地开发环境',
  'docker-compose-dev-env',
  '不用再纠结本机装了几个版本的 Postgres 和 Redis。这套 compose 配置开箱即用，还带健康检查和热重载。',
  '每次新项目第一件事都是配环境，第二件事是跟版本冲突搏斗。Compose 把这套流程彻底消灭了。

## 目录结构

```
project/
├─ docker-compose.yml
├─ .env
├─ api/
│  ├─ Dockerfile
│  └─ src/
└─ infra/
   └─ postgres/
      └─ init.sql
```

## compose 文件

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d app"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 10

  api:
    build: ./api
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/app
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    volumes:
      - ./api/src:/app/src

volumes:
  pgdata:
```

## 三个关键点

### 1. depends_on 的健康检查条件

默认的 `depends_on` 只保证**启动顺序**，不保证**服务就绪**。数据库进程起来了但还在初始化，你的第一条查询就会连接失败。用健康检查把这个问题消掉。

### 2. 源码挂载而不是全量重建

```yaml
volumes:
  - ./api/src:/app/src
```

Node 项目用 `nodemon` / `tsx watch` 就能热重载，改代码不用重建镜像。Go、Rust 这类编译型语言就不适合，得用air 之类的热重载工具。

### 3. 本地密码写进 compose 文件是可以接受的

这份文件不会进生产环境。真正需要保护的是生产凭证，而那应该由部署平台的 Secret 注入。用 `.env` 做本地覆盖就够了。

## 日常命令

```bash
docker compose up -d --build
docker compose logs -f api
docker compose exec db psql -U dev -d app
docker compose down -v
```

最后那条 `down -v` 别手抖，`-v` 会删掉数据卷，本地数据全没。',
  ARRAY['Docker', 'DevOps', '工具链']::text[],
  'published',
  5,
  '2026-10-09T18:56:37.497975+08:00',
  '2026-10-09T18:56:37.497975+08:00'
) ON CONFLICT (slug) DO NOTHING;

-- React Server Components 踩坑记录：边界在哪里
INSERT INTO posts (owner_id, title, slug, excerpt, content_md, tags, status, reading_minutes, created_at, updated_at)
VALUES (
  'system',
  'React Server Components 踩坑记录：边界在哪里',
  'rsc-gotchas',
  '''use client'' 不是性能开关，而是边界声明。这篇记录我在 RSC 上花了两周才想明白的几件事。',
  'RSC 的心智模型和传统 React 完全不同。最花时间的不是写代码，而是**判断一段逻辑该放在哪一侧**。

## 核心规则：单向流动

```
Server Component ──可传 props──> Client Component
Client Component ──✗ 不可──> Server Component
```

一旦在客户端组件里 import 一个服务端组件，构建就会失败。这是设计如此，不是 bug。

## 坑一：use client 会连带打包整个依赖树

我原本只想让一个按钮变成客户端组件：

```tsx
''use client''
import { useState } from ''react''
import { formatCurrency } from ''@/lib/money''
```

结果 `formatCurrency` 连带它引用的 date-fns、整个图表库，全部进了客户端 bundle。

**修法**：把纯函数从客户端文件里拆出去，让 `use client` 停在最靠近叶子节点的地方。

## 坑二：Context Provider 不能跨边界

```tsx
// app/layout.tsx (Server)
<ThemeProvider>        {/* 客户端 Context */}
  <Sidebar />         {/* 服务端组件 */}
</ThemeProvider>
```

`Sidebar` 在服务端渲染，拿不到 Theme 的 context value。

**修法**：Provider 本身是客户端组件时，它的 children 会被作为 props 传下去并在服务端渲染，但**只有客户端组件**能消费到 context。想让服务端组件用到数据，得用 headers() / cookies() 直接读。

## 坑三：串行请求瀑布

```tsx
// ❌ 两个 await 在组件里顺序执行
const user = await getUser()
const posts = await getPosts(user.id)
```

每个 await 阻塞一次渲染往返。能并行的就 Promise.all：

```tsx
const [user, settings] = await Promise.all([getUser(), getSettings()])
```

存在依赖关系的才需要串行，这时候用 Suspense + 嵌套流式渲染收益最大 —— 外层壳先出来，内层数据到了再填。

## 坑四：环境变量只在服务端可见

```ts
// lib/db.ts — 没有 use client，只在这里能用
const url = process.env.DATABASE_URL!
```

如果客户端组件不小心引用了这个模块，构建会直接把值inline 进去或直接报错。**规则**：敏感变量只放服务端文件，并且加 lint 规则禁止被客户端引用。

## 我的判断标准

新代码我会问三个问题：

1. 这段逻辑需要浏览器 API 吗？（window、事件、state）
2. 它需要交互吗？
3. 它依赖的数据是不是所有用户都一样？

按这三条筛一遍，RSC 的边界问题基本就消失了。',
  ARRAY['React', 'Next.js', '前端架构', '踩坑']::text[],
  'published',
  8,
  '2026-10-09T18:56:46.008178+08:00',
  '2026-10-09T18:56:46.008178+08:00'
) ON CONFLICT (slug) DO NOTHING;
