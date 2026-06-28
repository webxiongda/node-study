# Day 26 — 接入真实数据库：验收自测

## 题 1：迁移命令区别

`prisma migrate dev` 和 `prisma migrate deploy` 各适合哪个环境？有什么区别？

## 题 2：Seed 幂等性

为什么 Seed 脚本应该用 `upsert` 而不是 `create`？

## 题 3：连接泄漏

以下代码有什么问题？

```ts
async someOperation() {
  const prisma = new PrismaClient();
  const data = await prisma.post.findMany();
  return data;  // 没有 $disconnect()
}
```

## 题 4：生产 Docker 启动

在 Dockerfile 的 CMD 里，启动命令应该是什么？（先迁移，再启动）

## 参考答案

**题 1**：
- `migrate dev`：开发用，会创建新迁移文件、应用迁移、生成 Client，可能重置数据库
- `migrate deploy`：生产/CI 用，只应用已有迁移文件，不创建新迁移，不重置数据库，安全

**题 2**：
Seed 可能多次运行（新开发者、CI 重置环境等），`create` 重复运行会因唯一约束报错；`upsert` 幂等——已存在则跳过/更新，不存在则创建。

**题 3**：
每次调用 `someOperation()` 都创建一个新的 `PrismaClient` 实例，打开新的数据库连接，但从未调用 `$disconnect()` 关闭。长时间运行后连接数会耗尽，导致 "too many connections" 错误。

正确做法：`PrismaService` 作为单例注入，应用生命周期内共享，`onModuleInit` 连接，`onModuleDestroy` 断开。

**题 4**：
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```
先跑迁移确保数据库 schema 是最新的，再启动应用。
