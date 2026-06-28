# Day 21 — 项目任务：设计博客数据库

## 业务背景

为博客系统设计并创建真实的 PostgreSQL 数据库结构，为后续 Prisma 接入做准备。

## 任务：建表 + 基础 SQL 练习

### 数据库设计

设计以下表（博客核心实体）：
1. `users`（用户）
2. `posts`（文章）
3. `tags`（标签）
4. `post_tags`（文章-标签关联）
5. `comments`（评论）

### 字段要求

**users**：id, email(唯一), name, password_hash, role(user/admin), created_at

**posts**：id, title, content, slug(唯一), status(draft/published), views(默认0), author_id(外键), created_at, updated_at

**tags**：id, name(唯一), slug(唯一)

**post_tags**：post_id, tag_id（复合主键）

**comments**：id, content, post_id(外键), author_id(外键), created_at

### SQL 练习题（完成后对照答案）

1. 查询所有已发布文章，包含作者名字，按创建时间降序
2. 查询文章 ID=1 的所有标签
3. 查询评论最多的 5 篇文章（包含评论数）
4. 统计每个用户发布的文章数量
5. 为 `posts.author_id` 和 `posts.status` 创建合适的索引

## 验收标准

```bash
# 连接数据库
psql -U postgres -d blog_dev

# 验证表创建成功
\dt
# users | posts | tags | post_tags | comments

# 插入测试数据后验证 5 条查询均正确
```

## 常见坑

1. 外键约束 `ON DELETE CASCADE` vs `ON DELETE SET NULL` 的选择：
   - 删用户时文章一起删 → CASCADE
   - 删用户时文章保留（author_id 变 NULL）→ SET NULL + 字段允许 NULL
2. `TIMESTAMPTZ` 比 `TIMESTAMP` 更适合多时区应用
3. `SERIAL` 是整数自增，大型应用考虑 `BIGSERIAL` 或 UUID
4. 索引要在插入大量数据后再创建（创建后插入比先有索引后插入快）
