-- ============================================================
-- 流浪者博客 · 建表自检脚本
-- 在 Supabase SQL Editor 里执行这一段，Result 会明确告诉你哪项没通过。
-- ============================================================

SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='posts')
    AS "表_posts",
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='site_owner')
    AS "表_site_owner",
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='posts')
    AS "posts字段数_应为13",
  (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='posts')
    AS "posts索引数_应为3",
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('is_signed_in','bump_post_view'))
    AS "关键函数数_应为2",
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='posts')
    AS "posts策略数_应为4",
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='site_owner')
    AS "site_owner策略数_应为3",
  (SELECT bool_or(c.relrowsecurity) FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('posts','site_owner'))
    AS "RLS已开启_应为true";

-- 再单独执行这一段，确认能正常读空表（不报错 = 表结构正确）
SELECT count(*) AS "posts当前行数_应为0" FROM posts;
