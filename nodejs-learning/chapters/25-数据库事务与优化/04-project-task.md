# Day 25 — 项目任务：优化博客 API 查询性能

## 任务：检测并修复 N+1，实现 Cursor 分页

### Task 1：开启查询日志，检测 N+1

在 `PrismaService` 里开启查询日志，检查博客 API 的文章列表接口是否有 N+1 问题。

```ts
// prisma.service.ts
constructor() {
  super({ log: [{ emit: 'event', level: 'query' }] });
  this.$on('query' as any, (e: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Prisma] ${e.query} (${e.duration}ms)`);
    }
  });
}
```

检查 `GET /posts` 请求日志，看是否有多余的重复 SELECT。

### Task 2：优化文章列表查询

要求：
1. 只取列表页需要的字段（不取 content）
2. 一次查询加载作者名和标签
3. 用 `_count` 获取评论数（不是 include 所有评论）
4. 用 `$transaction` 并行获取列表和总数

### Task 3：实现 Cursor 分页接口

新增接口：`GET /posts/scroll?cursor=<lastId>&limit=20`

返回格式：
```json
{
  "data": [...],
  "nextCursor": 42,
  "hasNextPage": true
}
```

### Task 4：添加数据库索引

根据 API 的查询模式，在 Prisma schema 里添加合适的复合索引：
- `posts` 按 `status + createdAt` 查询和排序
- `comments` 按 `postId` 查询

## 验收标准

```bash
# 1. 查询日志里文章列表只有 2-3 次查询（不是 N+1）

# 2. Cursor 分页
curl "http://localhost:3000/posts/scroll?limit=3"
# 返回 { data: [...], nextCursor: 3, hasNextPage: true }

curl "http://localhost:3000/posts/scroll?cursor=3&limit=3"
# 返回下一批

# 3. EXPLAIN ANALYZE 显示索引被利用
psql -d blog_dev -c "EXPLAIN ANALYZE SELECT * FROM posts WHERE status='PUBLISHED' ORDER BY created_at DESC LIMIT 20"
# 应该看到 Index Scan，不是 Seq Scan
```
