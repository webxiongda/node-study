# Day 21 — PostgreSQL 基础：理论笔记

## 核心概念

### 为什么选 PostgreSQL ★

| 特性 | PostgreSQL | MySQL |
|------|-----------|-------|
| JSON 支持 | 原生 JSONB，可索引 | JSON 支持较弱 |
| 事务 | 完整 ACID | 完整 ACID |
| 全文搜索 | 内置 | 需插件 |
| 数组类型 | 原生 | 不支持 |
| 扩展 | 丰富（PostGIS 等） | 较少 |
| 面试偏好 | 全栈岗首选 | 传统 Web 常见 |

### 数据类型 ★

```sql
-- 整数
id SERIAL PRIMARY KEY          -- 自增整数（等价于 INTEGER + SEQUENCE）
id BIGSERIAL PRIMARY KEY       -- 大整数自增
id UUID DEFAULT gen_random_uuid()  -- UUID

-- 字符串
name VARCHAR(100)              -- 变长，最大 100
content TEXT                   -- 无限制
code CHAR(3)                   -- 定长

-- 数字
price DECIMAL(10, 2)           -- 精确小数（金融用）
rating FLOAT                   -- 浮点（科学计算用）

-- 时间
created_at TIMESTAMPTZ DEFAULT NOW()  -- 带时区时间戳（推荐）
birth_date DATE

-- 布尔
is_active BOOLEAN DEFAULT true

-- JSON
metadata JSONB                 -- 二进制 JSON，支持索引（推荐）
```

### 基础 SQL ★

```sql
-- 创建表
CREATE TABLE posts (
  id        SERIAL PRIMARY KEY,
  title     VARCHAR(100) NOT NULL,
  content   TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status    VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRUD
INSERT INTO posts (title, content, author_id) VALUES ('标题', '内容', 1);
SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 10;
UPDATE posts SET title = '新标题' WHERE id = 1;
DELETE FROM posts WHERE id = 1;

-- 分页
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;  -- 第3页（每页20条）

-- 模糊搜索
SELECT * FROM posts WHERE title ILIKE '%nestjs%';  -- 不区分大小写

-- 计数
SELECT COUNT(*) FROM posts WHERE status = 'published';
```

### 约束 ★

```sql
-- NOT NULL：字段不允许为空
-- UNIQUE：唯一约束（自动创建索引）
-- PRIMARY KEY：主键 = NOT NULL + UNIQUE
-- FOREIGN KEY：外键约束，保证引用完整性
-- CHECK：自定义约束条件
-- DEFAULT：默认值

ALTER TABLE posts ADD CONSTRAINT uq_posts_slug UNIQUE (slug);
```

### 索引 ★面试常考

```sql
-- 普通索引（B-tree，默认）
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- 唯一索引
CREATE UNIQUE INDEX idx_posts_slug ON posts(slug);

-- 复合索引（字段顺序很重要！）
CREATE INDEX idx_posts_author_status ON posts(author_id, status);
-- 可以用于：WHERE author_id = 1（利用）
-- 可以用于：WHERE author_id = 1 AND status = 'published'（利用）
-- 不能用于：WHERE status = 'published'（不利用，因为 author_id 是第一个字段）

-- EXPLAIN 分析查询计划
EXPLAIN ANALYZE SELECT * FROM posts WHERE author_id = 1;
```

**索引的代价**：加快读，拖慢写（每次 INSERT/UPDATE/DELETE 需要维护索引）。不是越多越好。

**B-tree 索引适合**：`=`、`<`、`>`、`BETWEEN`、`ORDER BY`、`LIKE 'prefix%'`（前缀匹配）
**不适合**：`LIKE '%suffix'`（后缀匹配）、全文搜索

### 事务基础

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- 或回滚
BEGIN;
  ...
ROLLBACK;
```

ACID：
- **A（原子性）**：要么全成功，要么全回滚
- **C（一致性）**：事务前后数据满足约束
- **I（隔离性）**：并发事务互不干扰
- **D（持久性）**：提交后数据不会丢失

## 面试高频问题

**Q：VARCHAR 和 TEXT 的区别？**
VARCHAR(n) 有长度限制，超出报错；TEXT 无限制。在 PostgreSQL 中两者性能几乎相同，不同于 MySQL。推荐使用 TEXT（无需纠结长度）或用 VARCHAR 配合 CHECK 约束做业务验证。

**Q：TIMESTAMPTZ 和 TIMESTAMP 的区别？**
TIMESTAMPTZ 存储时会转换为 UTC，读取时按连接的时区转换——多时区应用必须用 TIMESTAMPTZ。TIMESTAMP 不存储时区信息，容易在跨时区系统中出现混乱。

**Q：索引的代价是什么？什么情况下不该建索引？**
索引会加速 SELECT，但每次 INSERT/UPDATE/DELETE 都要维护索引，增加写入时间和存储空间。不该建索引的情况：低选择性字段（如布尔值）、写多读少的表、小表（全表扫描往往更快）。

## 快速上手

```bash
# macOS 安装
brew install postgresql@15
brew services start postgresql@15

# 连接
psql -U postgres

# 创建数据库
CREATE DATABASE blog_dev;
\c blog_dev
```
