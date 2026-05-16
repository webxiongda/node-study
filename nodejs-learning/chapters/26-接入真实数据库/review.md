# Day 26 — 接入真实数据库：复习文档

## 阶段二总结（Day 21-26 数据库）

| Day | 主题 | 核心技能 |
|-----|------|---------|
| 21 | PostgreSQL 基础 | 建表/CRUD/约束/索引 |
| 22 | SQL 进阶 | JOIN/聚合/窗口函数 |
| 23 | Prisma 入门 | Schema/迁移/CRUD |
| 24 | Prisma 关联 | 多对多/事务/嵌套写入 |
| 25 | 事务与优化 | 隔离级别/N+1/Cursor分页 |
| 26 | 接入真实数据库 | 生产配置/Seed/迁移工作流 |

## 核心要点

- 开发：`migrate dev`，生产：`migrate deploy`
- Seed 用 `upsert` 保证幂等
- `PrismaService extends PrismaClient` + 单例 = 正确用法
- N+1 → `include` / `_count`
- 大数据分页 → Cursor 替代 OFFSET

## 下一阶段预告

**Day 27-31：认证安全**
- JWT 认证（access token + refresh token）
- RBAC 权限控制
- OAuth2 第三方登录
- Web 安全（XSS/CSRF/SQL注入）
