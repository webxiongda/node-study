# Day 24 — 项目任务：Prisma 复杂关联实战

## 任务：实现文章标签管理 + 评论系统

### 功能 1：文章标签管理
- `PUT /posts/:id/tags`：替换文章标签（传入 tagId 数组，全量替换）
- `GET /tags`：获取所有标签及文章数
- `POST /tags`：创建新标签（检查 slug 唯一性）

### 功能 2：评论系统
- `GET /posts/:id/comments`：获取文章评论（分页，包含作者信息）
- `POST /posts/:id/comments`：创建评论（需要登录）
- `DELETE /comments/:id`：删除评论（只能删自己的，或 admin）

### Prisma 查询要求

1. 文章列表时，同时返回标签列表（include tags）
2. 文章详情时，返回评论列表（分页，最新在前），每条评论包含作者名
3. 标签列表包含每个标签的文章数（用 `_count`）

```ts
// 标签列表含文章数
const tags = await prisma.tag.findMany({
  include: {
    _count: { select: { posts: true } },
  },
  orderBy: { posts: { _count: 'desc' } },
});
```

## 验收标准

```bash
# 1. 获取标签列表（含文章数）
curl http://localhost:3000/tags
# [{"id":1,"name":"NestJS","slug":"nestjs","_count":{"posts":3}}]

# 2. 替换文章标签
curl -X PUT http://localhost:3000/posts/1/tags \
  -H 'Content-Type: application/json' \
  -d '{"tagIds":[1,2]}'

# 3. 发表评论
curl -X POST http://localhost:3000/posts/1/comments \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TOKEN' \
  -d '{"content":"非常好的文章！"}'

# 4. 文章详情包含评论
curl http://localhost:3000/posts/1 | jq .comments
```

## 常见坑

1. 替换标签：`set: [], connect: [...]` — 注意 `set: []` 是必须的，否则只会添加不会删除旧标签
2. 用 `_count` 统计关联数量时，`orderBy` 写法：`{ posts: { _count: 'desc' } }`
3. 评论的作者权限校验：从 `req.user.id`（JWT 注入）和 `comment.authorId` 比对
4. 删除评论时，用 `$transaction` 先查再删，防止非作者删除
