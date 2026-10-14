"""从 seed/posts.json 生成可在 Supabase SQL Editor 直接执行的 INSERT 语句。"""
import json
import io
import re

posts = json.load(io.open('seed/posts.json', encoding='utf-8'))


def q(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


header = [
    '-- ============================================================',
    '-- 流浪者博客 · 文章导入（4 篇）',
    '-- 在 Supabase SQL Editor 里整段粘贴执行',
    '--',
    '-- owner_id 固定为 system：SQL Editor 没有登录态，auth.uid() 会返回 NULL，',
    '-- 撞上非空约束报错。填一个占位身份即可；正式登录用户写文章时，',
    '-- 数据库会自动填入其真实 uid。',
    '--',
    '-- 用 ON CONFLICT DO NOTHING 保证重复执行不会报错。',
    '-- ============================================================',
    '',
]

out = list(header)

for p in posts:
    tags = ', '.join(q(t) for t in p.get('tags', []))
    out.append('-- ' + p['title'])
    out.append(
        'INSERT INTO posts (owner_id, title, slug, excerpt, content_md, tags, '
        'status, reading_minutes, created_at, updated_at)'
    )
    out.append('VALUES (')
    out.append("  'system',")
    out.append('  ' + q(p['title']) + ',')
    out.append('  ' + q(p['slug']) + ',')
    out.append('  ' + q(p['excerpt']) + ',')
    out.append('  ' + q(p['content_md']) + ',')
    out.append('  ARRAY[' + tags + ']::text[],')
    out.append('  ' + q(p['status']) + ',')
    out.append('  ' + str(p['reading_minutes']) + ',')
    out.append('  ' + q(p['created_at']) + ',')
    out.append('  ' + q(p['updated_at']))
    out.append(') ON CONFLICT (slug) DO NOTHING;')
    out.append('')

io.open('supabase/seed.sql', 'w', encoding='utf-8').write('\n'.join(out))

# ---- 校验 ----
s = io.open('supabase/seed.sql', encoding='utf-8').read()
stmts = re.findall(
    r'INSERT INTO posts.*?\n\) ON CONFLICT \(slug\) DO NOTHING;', s, re.S
)
print('已生成 supabase/seed.sql')
print('INSERT 语句数:', len(stmts))
bad = 0
for i, st in enumerate(stmts, 1):
    t = re.search(r"VALUES \(\n  '[^']*',\n  '([^']{0,26})", st)
    ok = (
        st.count("'") % 2 == 0
        and st.count('(') == st.count(')')
        and st.count('[') == st.count(']')
        and "  'system'," in st
    )
    name = t.group(1) if t else '?'
    print('  %d. %-30s %s' % (i, name[:28], 'OK' if ok else 'FAIL'))
    if not ok:
        bad += 1
print('owner_id 占位数量:', s.count("'system',"))
print('结论:', '全部通过' if bad == 0 else '%d 条有问题' % bad)
