# Day 22 — SQL 进阶：实操 Demo

## Demo 1：JOIN 练习

```sql
-- 准备数据（基于 Day 21 的表结构）

-- 查询所有已发布文章（包含作者姓名）
SELECT p.id, p.title, p.status, u.name as author_name, p.created_at
FROM posts p
INNER JOIN users u ON p.author_id = u.id
WHERE p.status = 'published'
ORDER BY p.created_at DESC;

-- 查询所有用户及其文章数（包括没有文章的用户）
SELECT u.id, u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
GROUP BY u.id, u.name
ORDER BY post_count DESC;

-- 查询文章及其标签列表（一篇文章多个标签）
SELECT p.title, STRING_AGG(t.name, ', ' ORDER BY t.name) as tags
FROM posts p
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id, p.title;

-- 查询有评论的文章（使用 EXISTS）
SELECT * FROM posts p
WHERE EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id);

-- 查询没有评论的文章（使用 NOT EXISTS）
SELECT * FROM posts p
WHERE NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id);
```

---

## Demo 2：聚合 + 窗口函数

```sql
-- 统计各状态文章数
SELECT status, COUNT(*) as count
FROM posts
GROUP BY status
ORDER BY count DESC;

-- 评论数最多的 5 篇文章
SELECT p.id, p.title, COUNT(c.id) as comment_count
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id, p.title
ORDER BY comment_count DESC
LIMIT 5;

-- 每个作者最新发布的文章（窗口函数）
SELECT id, title, author_id, created_at FROM (
  SELECT
    id, title, author_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as rn
  FROM posts
  WHERE status = 'published'
) sub
WHERE rn = 1;

-- 每月发文量统计
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as post_count
FROM posts
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

---

## Demo 3：EXPLAIN 分析慢查询

```sql
-- 创建测试数据（10万条）
INSERT INTO posts (title, content, slug, status, author_id)
SELECT
  '测试文章' || gs,
  REPEAT('内容', 10),
  'test-post-' || gs,
  CASE WHEN gs % 3 = 0 THEN 'published' ELSE 'draft' END,
  (gs % 10) + 1
FROM generate_series(1, 100000) gs;

-- 分析慢查询（无索引）
EXPLAIN ANALYZE
SELECT * FROM posts WHERE author_id = 5 AND status = 'published';
-- 观察：Seq Scan，actual time 较大

-- 创建复合索引
CREATE INDEX idx_posts_author_status ON posts(author_id, status);

-- 再次分析（有索引）
EXPLAIN ANALYZE
SELECT * FROM posts WHERE author_id = 5 AND status = 'published';
-- 观察：Index Scan，actual time 大幅降低

-- 分析排序查询
EXPLAIN ANALYZE
SELECT * FROM posts WHERE author_id = 5 ORDER BY created_at DESC LIMIT 10;
-- 可能需要额外索引：CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
```
