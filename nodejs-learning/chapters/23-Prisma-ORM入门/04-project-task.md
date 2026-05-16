# Day 23 — 项目任务：博客 API 接入 Prisma

## 业务背景

将 Day 20 的博客 API（内存数组版本）替换为 Prisma + PostgreSQL，实现真实数据持久化。

## 任务步骤

### Step 1：初始化 Prisma

```bash
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init
```

### Step 2：定义 Schema

在 `prisma/schema.prisma` 中定义 `User`、`Post`、`Tag`、`Comment` 四个模型（参考 Day 23 Demo 1）。

### Step 3：创建 PrismaService

创建 `src/prisma/prisma.service.ts`（extends PrismaClient + OnModuleInit）和 `src/prisma/prisma.module.ts`（exports PrismaService）。

### Step 4：替换 PostsService

将 PostsService 的内存数组逻辑替换为 Prisma 查询：
- `findAll`：带 where/include/orderBy/skip/take 的分页查询 + count（用 `$transaction`）
- `findOne`：`findUniqueOrThrow`
- `create`：`prisma.post.create`（注意 tags 的多对多关联）
- `update`：`prisma.post.update`
- `remove`：`prisma.post.delete`

### Step 5：处理 Prisma 异常

在 GlobalExceptionFilter 里处理 Prisma 特定错误：
- `P2002`（唯一约束冲突）→ 409 Conflict
- `P2025`（记录不存在）→ 404 Not Found

## 验收标准

```bash
# 1. 迁移成功
npx prisma migrate dev --name init

# 2. 创建文章
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"第一篇真实文章","content":"存储在 PostgreSQL 数据库里了！","author":"Alice"}'

# 3. 重启应用后数据仍然存在（持久化验证）
curl http://localhost:3000/posts

# 4. 触发 P2025（文章不存在）→ 404
curl http://localhost:3000/posts/9999

# 5. Prisma Studio 里能看到数据
npx prisma studio
```

## 常见坑

1. `PrismaModule` 需要在 `PostsModule` 的 `imports` 里，否则 `PrismaService` 注入失败
2. `$transaction` 里的查询并行执行，返回数组 `[posts, total]`
3. 多对多关联创建：`tags: { connect: [{ id: 1 }, { id: 2 }] }` 或 `{ connectOrCreate: [...] }`
4. 生产环境需要 `prisma migrate deploy`，不是 `prisma migrate dev`（dev 会重置数据库）
5. `findUniqueOrThrow` 抛的不是 `NotFoundException`，需要在 Filter 里捕获并转换
