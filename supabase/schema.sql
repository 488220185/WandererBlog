-- 流浪者博客 · PostgreSQL 建表脚本
-- 适用于 Supabase / Vercel Postgres / Neon 等任意 PostgreSQL
-- 执行方式：Supabase SQL Editor 粘贴执行，或 psql -f schema.sql

-- ============================================================
-- 1. 文章表
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id              BIGSERIAL PRIMARY KEY,
  owner_id        TEXT        NOT NULL DEFAULT auth.uid()::text,
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  excerpt         TEXT,
  content_md      TEXT        NOT NULL DEFAULT '',
  cover_url       TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'published',
  views           INTEGER     NOT NULL DEFAULT 0,
  reading_minutes INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags          ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_posts_slug          ON posts (slug);

COMMENT ON TABLE posts IS '博客文章：Markdown 正文 + 标签数组';

-- ============================================================
-- 2. 站点信息表（单行，id = 1）
-- ============================================================
CREATE TABLE IF NOT EXISTS site_owner (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  uid           TEXT NOT NULL,
  owner_email   TEXT,
  blog_title    TEXT NOT NULL DEFAULT '流浪者博客',
  blog_subtitle TEXT NOT NULL DEFAULT '写代码，也写踩过的坑',
  author_name   TEXT NOT NULL DEFAULT '流浪者',
  author_bio    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_owner IS '站点归属与站点信息：首个注册用户成为博主本人';

-- ============================================================
-- 3. 登录态判断函数
--    ⚠️ 关键：未登录时，Supabase 的 auth.uid() 返回 NULL，
--       但 WorkBuddy 的 auth.uid() 返回字符串 'anon'。
--       所以这里统一转成 text 再比较，两种环境都能正确判断，
--       避免匿名访客匹配到 owner_id = 'anon' 而写入成功。
--
--    注意：不能直接写 auth.uid() <> ''，因为 Supabase 里 auth.uid()
--    是 uuid 类型，与字符串比较会报 22P02 类型转换错误。
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_signed_in()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid()::text <> ''
     AND auth.uid()::text <> 'anon'
$$;

-- ============================================================
-- 4. 浏览量自增
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_post_view(p_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE posts SET views = views + 1 WHERE slug = p_slug AND status = 'published';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;

REVOKE EXECUTE ON FUNCTION public.bump_post_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_post_view(text) TO authenticated, anon;
