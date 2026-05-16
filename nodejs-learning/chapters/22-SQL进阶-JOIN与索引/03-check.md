# Day 22 — SQL 进阶：验收自测

---

## 题 1（概念）

关于 JOIN 和聚合，以下哪些正确？（多选）

A. INNER JOIN 会保留左表中没有匹配的行
B. HAVING 子句不能使用聚合函数
C. `COUNT(*)` 和 `COUNT(column)` 的区别是后者不计 NULL 值
D. 复合索引 `(a, b)` 可以用于 `WHERE b = ?` 的查询
E. EXISTS 子查询找到第一个匹配就停止，比 IN 在大结果集时更快

---

## 题 2（SQL 题）

写 SQL：统计每个标签下已发布的文章数，只显示文章数 >= 5 的标签，按文章数降序排列。涉及表：`posts`、`tags`、`post_tags`。

---

## 题 3（SQL 题）

写 SQL：查询每个用户最近发布（status='published'）的文章的标题和发布时间（每个用户只返回最新一篇）。

---

## 题 4（分析题）

以下查询很慢，如何优化？

```sql
SELECT * FROM posts
WHERE LOWER(title) = 'nestjs learning'
ORDER BY created_at DESC;
```

---

## 题 5（业务场景）

有 `orders` 表（id, user_id, amount, status, created_at）。写 SQL：
1. 统计每个用户的订单总金额，只包含 status='completed' 的订单，按总金额降序
2. 查询下单金额超过该用户平均金额的订单（需要用子查询或窗口函数）

---

## 参考答案

### 题 1：C、E

- A 错：INNER JOIN 不保留未匹配行，那是 LEFT JOIN 的行为
- B 错：HAVING 可以使用聚合函数（这正是 HAVING 的用途，WHERE 不能用聚合函数）
- C 正确
- D 错：最左前缀原则，`WHERE b = ?` 跳过了第一个字段 a，无法利用索引
- E 正确

### 题 2

```sql
SELECT t.name, COUNT(p.id) as post_count
FROM tags t
JOIN post_tags pt ON t.id = pt.tag_id
JOIN posts p ON pt.post_id = p.id
WHERE p.status = 'published'
GROUP BY t.id, t.name
HAVING COUNT(p.id) >= 5
ORDER BY post_count DESC;
```

### 题 3

```sql
SELECT id, author_id, title, created_at FROM (
  SELECT
    id, author_id, title, created_at,
    ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as rn
  FROM posts
  WHERE status = 'published'
) ranked
WHERE rn = 1;
```

### 题 4

问题：`LOWER(title)` 对索引列做了函数运算，导致索引失效。

优化方案：
```sql
-- 方案1：创建函数索引
CREATE INDEX idx_posts_title_lower ON posts (LOWER(title));

-- 方案2：改用 ILIKE（利用普通索引的前缀匹配，但 ILIKE '%..%' 仍无法用）
-- 若是精确匹配，改为：
WHERE title ILIKE 'nestjs learning'  -- 仍无法用 B-tree 索引

-- 方案3：存储时归一化（全存小写），查询时也小写比较，可用普通索引

-- 同时优化排序：
CREATE INDEX idx_posts_title_created ON posts (LOWER(title), created_at DESC);
```

### 题 5

```sql
-- 1. 每个用户完成订单总金额
SELECT user_id, SUM(amount) as total_amount
FROM orders
WHERE status = 'completed'
GROUP BY user_id
ORDER BY total_amount DESC;

-- 2. 超过该用户平均金额的订单（窗口函数）
SELECT id, user_id, amount, avg_amount FROM (
  SELECT
    id, user_id, amount,
    AVG(amount) OVER (PARTITION BY user_id) as avg_amount
  FROM orders
) sub
WHERE amount > avg_amount;

-- 或用子查询
SELECT o.* FROM orders o
WHERE o.amount > (
  SELECT AVG(amount) FROM orders WHERE user_id = o.user_id
);
```
