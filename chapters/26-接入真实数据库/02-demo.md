# Day 26 — 接入真实数据库：实操 Demo

## Demo：完整博客 API 数据库接入

### 1. 初始化数据库

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE blog_dev;"

# 运行迁移
npx prisma migrate dev --name init

# 验证
npx prisma migrate status
# ✓ Database schema is up to date!
```

### 2. 运行 Seed

```bash
npx prisma db seed
# Seed 完成

# 用 Prisma Studio 验证数据
npx prisma studio
```

### 3. 测试完整 API

```bash
pnpm start:dev

# 文章列表（真实数据库）
curl http://localhost:3000/posts | jq .

# 重启应用，数据仍然存在
pnpm start:dev
curl http://localhost:3000/posts  # 数据持久化 ✅

# 触发 Prisma P2025（Not Found）→ 应该返回 404
curl http://localhost:3000/posts/9999

# 触发 Prisma P2002（Duplicate slug）
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"重复slug","content":"内容内容内容","author":"测试","slug":"example-post-1"}'
```

### 4. 健康检查接入数据库状态

```ts
// health.controller.ts
@Get()
async check() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
  } catch {
    throw new ServiceUnavailableException({ status: 'error', database: 'disconnected' });
  }
}
```
