# Day 21 — PostgreSQL 基础：实操 Demo

## Demo 1：建表和 CRUD

```sql
-- 连接数据库
psql -U postgres -d blog_dev

-- 创建用户表
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建文章表
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(100) NOT NULL,
  content    TEXT NOT NULL,
  slug       VARCHAR(120) UNIQUE,
  status     VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入测试数据
INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob');

INSERT INTO posts (title, content, slug, status, author_id) VALUES
  ('NestJS 入门', 'NestJS 是基于 Node.js 的企业级框架...', 'nestjs-intro', 'published', 1),
  ('PostgreSQL 学习', '今天学了 SQL 基础...', 'postgresql-learning', 'draft', 1),
  ('Redis 缓存', '缓存能大幅提升性能...', 'redis-cache', 'published', 2);

-- 查询
SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC;

-- 分页（第1页，每页2条）
SELECT * FROM posts ORDER BY created_at DESC LIMIT 2 OFFSET 0;

-- 模糊搜索
SELECT * FROM posts WHERE title ILIKE '%nestjs%';

-- 统计
SELECT status, COUNT(*) as count FROM posts GROUP BY status;
```

---

## Demo 2：索引实验

```sql
-- 创建 100 万条测试数据
INSERT INTO posts (title, content, slug, author_id)
SELECT
  '文章' || generate_series,
  '内容' || generate_series,
  'post-' || generate_series,
  1
FROM generate_series(1, 1000000);

-- 无索引查询（EXPLAIN 分析）
EXPLAIN ANALYZE SELECT * FROM posts WHERE author_id = 1;
-- Seq Scan（全表扫描），可能很慢

-- 创建索引
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- 有索引查询
EXPLAIN ANALYZE SELECT * FROM posts WHERE author_id = 1;
-- Index Scan（索引扫描），快很多

-- 比较两次的 actual time

-- 清理测试数据
DELETE FROM posts WHERE title LIKE '文章%';
```

---

## Demo 3：事务操作

```sql
-- 转账场景（确保原子性）
BEGIN;
  -- 检查余额（假设有 balance 字段）
  SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- 加锁
  
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
  
  -- 检查是否有负余额
  DO $$
  DECLARE
    bal DECIMAL;
  BEGIN
    SELECT balance INTO bal FROM accounts WHERE id = 1;
    IF bal < 0 THEN
      RAISE EXCEPTION '余额不足';
    END IF;
  END $$;
COMMIT;

-- 如果 RAISE EXCEPTION，自动 ROLLBACK

-- Node.js 里的事务（使用 pg 库）
-- const client = await pool.connect();
-- try {
--   await client.query('BEGIN');
--   await client.query('UPDATE...', []);
--   await client.query('UPDATE...', []);
--   await client.query('COMMIT');
-- } catch {
--   await client.query('ROLLBACK');
-- } finally {
--   client.release();
-- }
```
