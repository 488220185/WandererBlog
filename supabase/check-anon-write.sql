-- ============================================================
-- 流浪者博客 · 匿名写权限验证（安全回归测试）
--
-- 背景：直接 INSERT 不写 owner_id 时，NOT NULL 约束会先拦下报错（23502），
-- 这证明数据没被写进去，但**验证的不是 RLS**——因为字段都没填到 RLS 检查那一步。
--
-- 真正的 RLS 测试必须显式给一个非 NULL 的 owner_id，
-- 让语句走到 WITH CHECK 策略，由 is_signed_in() 来判定。
--
-- 逐条单独执行，每条都应该在「Result」出现红色报错。
-- ============================================================

-- 测试 1 · 插入：显式指定 owner_id，绕过 NOT NULL，考验 RLS
-- 期望：ERROR 42501  new row violates row-level security policy
INSERT INTO posts (owner_id, title, slug, content_md, tags, status)
VALUES (
  'anon',                      -- 模拟最坏情况：伪造的归属身份
  '安全测试_不应写入',
  'security-test-should-not-exist',
  '测试内容',
  '{}',
  'published'
);

-- 测试 2 · 修改：把第一篇文章的标题改掉
-- 期望：ERROR 42501  new row violates row-level security policy
-- （前提：posts 表里已经有数据。没有的话先跑 seed 导入）
-- UPDATE posts SET title = '被篡改的标题' WHERE slug = 'why-i-stopped-using-redux';

-- 测试 3 · 删除：删掉一篇文章
-- 期望：ERROR 42501  new row violates row-level security policy
-- DELETE FROM posts WHERE slug = 'why-i-stopped-using-redux';

-- ============================================================
-- 测试完成后，用下面这句确认数据没被动过（应为 0）：
--   SELECT count(*) AS "文章数" FROM posts;
-- ============================================================
