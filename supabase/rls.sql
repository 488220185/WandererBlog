-- 流浪者博客 · RLS 策略（Supabase）
-- ⚠️ 每条写策略都必须带 is_signed_in()，否则匿名访客可能写入数据。

ALTER TABLE posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_owner   ENABLE ROW LEVEL SECURITY;

-- ---------- posts ----------
-- 已发布文章所有人可读；草稿仅作者与博主本人可读
DROP POLICY IF EXISTS posts_read ON posts;
CREATE POLICY posts_read ON posts FOR SELECT TO authenticated, anon
  USING (status = 'published' OR owner_id = auth.uid()::text
         OR EXISTS (SELECT 1 FROM site_owner WHERE uid = auth.uid()::text));

-- 插入：必须真实登录，且 owner 由 DEFAULT auth.uid() 填充
DROP POLICY IF EXISTS posts_insert ON posts;
CREATE POLICY posts_insert ON posts FOR INSERT TO authenticated, anon
  WITH CHECK (is_signed_in() AND owner_id = auth.uid()::text);

-- 更新/删除：作者本人或博主本人
DROP POLICY IF EXISTS posts_update ON posts;
CREATE POLICY posts_update ON posts FOR UPDATE TO authenticated, anon
  USING (is_signed_in() AND (owner_id = auth.uid()::text
         OR EXISTS (SELECT 1 FROM site_owner WHERE uid = auth.uid()::text)))
  WITH CHECK (is_signed_in() AND (owner_id = auth.uid()::text
         OR EXISTS (SELECT 1 FROM site_owner WHERE uid = auth.uid()::text)));

DROP POLICY IF EXISTS posts_delete ON posts;
CREATE POLICY posts_delete ON posts FOR DELETE TO authenticated, anon
  USING (is_signed_in() AND (owner_id = auth.uid()::text
         OR EXISTS (SELECT 1 FROM site_owner WHERE uid = auth.uid()::text)));

-- ---------- site_owner ----------
-- 站点标题等公开信息任何人可读
DROP POLICY IF EXISTS site_owner_read ON site_owner;
CREATE POLICY site_owner_read ON site_owner FOR SELECT TO authenticated, anon USING (true);

-- 首个登录用户可写入成为博主本人
DROP POLICY IF EXISTS site_owner_insert ON site_owner;
CREATE POLICY site_owner_insert ON site_owner FOR INSERT TO authenticated, anon
  WITH CHECK (is_signed_in() AND uid = auth.uid()::text);

DROP POLICY IF EXISTS site_owner_update ON site_owner;
CREATE POLICY site_owner_update ON site_owner FOR UPDATE TO authenticated, anon
  USING (is_signed_in() AND uid = auth.uid()::text)
  WITH CHECK (is_signed_in() AND uid = auth.uid()::text);
