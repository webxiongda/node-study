# Day 21 — PostgreSQL 基础：验收自测

---

## 题 1（概念）

以下哪些说法正确？（多选）

A. PostgreSQL 的 TEXT 类型比 VARCHAR 性能更差
B. TIMESTAMPTZ 存储时会将时间转换为 UTC
C. 唯一约束（UNIQUE）会自动创建索引
D. 索引只加速读操作，不影响写操作
E. `LIKE '%nestjs%'` 可以使用 B-tree 索引加速

---

## 题 2（SQL 题）

写 SQL：查询 `posts` 表中，状态为 `published` 的文章，按 `created_at` 降序排列，取第 2 页（每页 10 条），同时返回文章作者的 `name`（需要 JOIN users 表）。

---

## 题 3（设计题）

`posts` 表有 100 万条记录，以下查询很慢：

```sql
SELECT * FROM posts WHERE author_id = 5 AND status = 'published';
```

应该建什么索引？索引的字段顺序有影响吗？

---

## 题 4（代码题）

以下事务代码有什么问题？

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- （应用崩溃，没有执行 COMMIT）
```

---

## 题 5（业务场景）

为博客系统设计数据库表，需要支持：文章有多个标签（tag），标签可以被多篇文章使用。描述表设计方案（多对多关系），写出建表 SQL。

---

## 参考答案

### 题 1：B、C

- A 错：PostgreSQL 中 TEXT 和 VARCHAR 性能几乎相同
- B 正确
- C 正确：UNIQUE 约束内部实现就是唯一索引
- D 错：索引会拖慢写操作（每次写需要维护索引）
- E 错：`LIKE '%nestjs%'` 是后缀/中间匹配，B-tree 索引不起作用；只有 `LIKE 'nestjs%'`（前缀）才能利用索引

### 题 2

```sql
SELECT p.*, u.name AS author_name
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE p.status = 'published'
ORDER BY p.created_at DESC
LIMIT 10 OFFSET 10;  -- 第2页：OFFSET = (page-1) * limit = (2-1) * 10 = 10
```

### 题 3

建复合索引：
```sql
CREATE INDEX idx_posts_author_status ON posts(author_id, status);
```

字段顺序有影响：选择性高的字段（区分度大的）放前面。`author_id` 区分度高（每个用户不同），应放第一位。
- `WHERE author_id = 5` → 可以用索引（只用第一个字段）
- `WHERE author_id = 5 AND status = 'published'` → 完全利用复合索引
- `WHERE status = 'published'` → 不能利用（必须从第一个字段开始）

### 题 4

问题：应用崩溃后，没有 COMMIT 也没有 ROLLBACK，事务处于悬挂状态。

PostgreSQL 的行为：连接断开时会自动 ROLLBACK，这两条 UPDATE 都不会生效。这其实体现了事务的**原子性**（A）—— 要么全部成功提交，要么全部回滚，不会出现一个 UPDATE 执行一个未执行的不一致状态。

### 题 5

多对多关系需要中间表：
```sql
-- 标签表
CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(60) UNIQUE NOT NULL
);

-- 文章-标签关联表（中间表）
CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)  -- 复合主键，防止重复关联
);

-- 索引（加速反向查询：查某 tag 下的所有文章）
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- 查询某篇文章的所有标签
SELECT t.* FROM tags t
JOIN post_tags pt ON t.id = pt.tag_id
WHERE pt.post_id = 1;

-- 查询某标签下的所有文章
SELECT p.* FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
WHERE pt.tag_id = 3;
```
