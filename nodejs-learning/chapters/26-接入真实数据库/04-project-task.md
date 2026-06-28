# Day 26 — 项目任务：博客 API 数据库里程碑

## 任务：完整接入 PostgreSQL，博客 API 可演示

### 完成清单

- [ ] Prisma schema 完整定义（User/Post/Tag/Comment）
- [ ] 迁移文件创建并应用
- [ ] Seed 数据（至少 2 个用户、10 篇文章、5 个标签）
- [ ] 所有 CRUD 接口使用 Prisma（不再使用内存数组）
- [ ] Prisma 异常在 ExceptionFilter 里处理（P2002→409, P2025→404）
- [ ] 健康检查接口（带数据库连通性检测）
- [ ] README 更新（包含数据库配置说明）

### 验收命令

```bash
# 全量验证
npx prisma migrate status        # 迁移已应用
npx prisma db seed               # Seed 成功
pnpm start:dev                   # 启动成功
curl http://localhost:3000/health # {"status":"ok","database":"connected"}
curl http://localhost:3000/posts  # 返回真实数据
pnpm test                        # 单元测试通过
```
