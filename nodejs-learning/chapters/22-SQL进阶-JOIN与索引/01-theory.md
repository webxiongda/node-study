# Day 22 — SQL 进阶：JOIN、聚合与索引优化

## JOIN 类型 ★面试必考

```
用户表 users：    文章表 posts（author_id 外键）：
id | name         id | title    | author_id
1  | Alice        1  | 文章A    | 1
2  | Bob          2  | 文章B    | 1
3  | Carol        3  | 文章C    | 2
                  4  | 文章D    | 99（不存在的用户）
```

```sql
-- INNER JOIN：只返回两表都有匹配的行
SELECT u.name, p.title FROM users u
INNER JOIN posts p ON u.id = p.author_id;
-- 结果：Alice/文章A、Alice/文章B、Bob/文章C（Carol无文章，文章D无用户，都排除）

-- LEFT JOIN：返回左表所有行，右表没有则 NULL
SELECT u.name, p.title FROM users u
LEFT JOIN posts p ON u.id = p.author_id;
-- 结果：Alice/文章A、Alice/文章B、Bob/文章C、Carol/NULL

-- RIGHT JOIN：返回右表所有行（用得少，等价于交换两表的 LEFT JOIN）

-- FULL OUTER JOIN：两表所有行，没有匹配的用 NULL 填充
SELECT u.name, p.title FROM users u
FULL OUTER JOIN posts p ON u.id = p.author_id;
-- 结果：Alice/文章A、Alice/文章B、Bob/文章C、Carol/NULL、NULL/文章D
```

**面试常考**：左连接 vs 内连接的区别：内连接丢弃没有匹配的行（找不到作者的文章被丢弃），左连接保留左表所有行（所有用户都出现，没文章的显示 NULL）。

## 聚合函数 + GROUP BY + HAVING ★

```sql
-- 每个用户的文章数
SELECT author_id, COUNT(*) as post_count
FROM posts
GROUP BY author_id;

-- 每个用户的文章数（包含姓名）+ HAVING 过滤
SELECT u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
GROUP BY u.id, u.name
HAVING COUNT(p.id) >= 2    -- HAVING 在 GROUP BY 之后过滤（不能用 WHERE）
ORDER BY post_count DESC;

-- 常用聚合函数
COUNT(*) / COUNT(column)   -- COUNT(*) 含 NULL，COUNT(col) 不含
SUM(column)
AVG(column)
MAX(column) / MIN(column)
STRING_AGG(column, ', ')   -- 将字符串拼接（PostgreSQL）
ARRAY_AGG(column)          -- 将值聚合成数组（PostgreSQL）
```

**WHERE vs HAVING**：WHERE 在分组前过滤行，不能用聚合函数；HAVING 在分组后过滤分组，可以用聚合函数。

## 子查询

```sql
-- 标量子查询
SELECT title, (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
FROM posts p;

-- IN 子查询
SELECT * FROM posts
WHERE author_id IN (SELECT id FROM users WHERE role = 'admin');

-- EXISTS 子查询（比 IN 更高效，找到第一个匹配就停止）
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id);

-- NOT EXISTS：没有发过文章的用户
SELECT * FROM users u
WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id);
```

## 窗口函数 ★面试加分

```sql
-- ROW_NUMBER：每组内排序编号
SELECT
  *,
  ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as rn
FROM posts;
-- rn=1 是每个作者最新的文章

-- 查询每个作者最新一篇文章（实际业务常见）
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as rn
  FROM posts
) sub WHERE rn = 1;

-- RANK / DENSE_RANK（有并列时有区别）
-- LAG / LEAD（访问上一行/下一行的值）
-- SUM OVER（累计和）
```

## EXPLAIN 分析 ★

```sql
EXPLAIN ANALYZE SELECT * FROM posts WHERE author_id = 1;
```

关键词解读：
- `Seq Scan`：全表扫描（没有用索引，通常是问题）
- `Index Scan`：使用了索引（好）
- `Bitmap Index Scan`：先扫索引再回表（中等）
- `actual time=...`：实际执行时间
- `rows=...`：预估行数（差异大说明统计信息过期，需 ANALYZE）

## 复合索引策略 ★

```sql
-- 场景：WHERE status = 'published' AND author_id = 1 ORDER BY created_at DESC
-- 最优索引：(author_id, status, created_at)
-- 规则：等值过滤字段在前，范围/排序字段在后

CREATE INDEX idx_posts_perf ON posts(author_id, status, created_at DESC);
```

**最左前缀原则**：复合索引 `(a, b, c)`：
- `WHERE a=?` ✅
- `WHERE a=? AND b=?` ✅
- `WHERE a=? AND b=? AND c=?` ✅
- `WHERE b=?` ❌（没有 a）
- `WHERE a=? AND c=?` ⚠️（只用 a，c 不起作用）

## 面试高频问题

**Q：INNER JOIN 和 LEFT JOIN 的区别？**
INNER JOIN 只返回两表有匹配的行，丢弃不匹配的；LEFT JOIN 返回左表所有行，右表无匹配时用 NULL 填充，保留了左表的完整性。

**Q：WHERE 和 HAVING 的区别？**
WHERE 在 GROUP BY 之前过滤行（不能用聚合函数）；HAVING 在 GROUP BY 之后过滤分组（可以用聚合函数）。

**Q：什么是索引的最左前缀原则？**
复合索引 `(a, b, c)` 必须从最左的字段开始使用才能利用索引。`WHERE a=?` 和 `WHERE a=? AND b=?` 都能用，但 `WHERE b=?` 不能用。

**Q：EXISTS 比 IN 在什么情况下更快？**
当子查询结果集很大时，EXISTS 更快——找到第一个匹配就停止（短路）；IN 需要构建完整的结果集。当子查询结果集很小时，IN 更快（一次比较）。
