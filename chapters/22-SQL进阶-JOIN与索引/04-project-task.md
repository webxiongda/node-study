# Day 22 — 项目任务：SQL 查询实战

## 任务：为博客系统写 5 个实际业务 SQL

基于 Day 21 设计的数据库，完成以下查询（先不看答案，独立写）：

### 查询 1：文章列表 API 的 SQL
支持：按状态筛选、关键词搜索（标题/内容）、分页、包含作者名和标签列表

```sql
-- 期望结果格式：
-- id | title | status | author_name | tags | created_at
-- 1  | ...   | pub... | Alice       | a,b  | ...
```

### 查询 2：文章详情页 SQL
返回文章完整信息 + 作者信息 + 评论列表（包含评论者姓名）

### 查询 3：用户主页统计 SQL
返回指定用户的：文章总数、已发布文章数、总浏览量、总评论数

### 查询 4：热门文章 SQL
按评论数 + 浏览量综合排名（评论数权重 3，浏览量权重 1），取前 10

### 查询 5：标签云 SQL
返回所有标签及其文章数，按文章数降序

## 验收标准

所有查询在 `psql` 里执行不报错，结果符合预期。

## 参考答案（完成后对照）

**查询 3**：
```sql
SELECT
  u.id,
  u.name,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'published') as published_posts,
  COALESCE(SUM(p.views), 0) as total_views,
  COUNT(c.id) as total_comments
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE u.id = $1
GROUP BY u.id, u.name;
```

**查询 4**：
```sql
SELECT p.id, p.title, p.views,
  COUNT(c.id) as comment_count,
  COUNT(c.id) * 3 + p.views as score
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.status = 'published'
GROUP BY p.id, p.title, p.views
ORDER BY score DESC
LIMIT 10;
```
