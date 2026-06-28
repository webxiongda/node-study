# Day 20 — 项目任务：NestJS 阶段里程碑

## 业务背景

完成 Day 16-19 学习后，把博客 API 做成一个完整可展示的项目。这是你简历上第一个 NestJS 项目，需要具备生产级代码结构。

## 任务：完整博客 API

### 功能要求

**文章模块（Posts）**：
- CRUD 完整实现
- 分页 + 搜索 + 按状态筛选
- 统一响应格式（Interceptor）
- 统一错误格式（Filter）

**基础设施**：
- ConfigModule（环境变量 + Joi 校验）
- Swagger 文档（`/api-docs`）
- `/health` 健康检查
- 全局 ValidationPipe（whitelist + transform）
- 全局 ExceptionFilter
- 日志 Middleware

### 项目结构

```
src/
├── common/
│   ├── filters/global-exception.filter.ts
│   ├── interceptors/transform.interceptor.ts
│   └── middleware/logger.middleware.ts
├── posts/
│   ├── dto/
│   │   ├── create-post.dto.ts
│   │   ├── update-post.dto.ts
│   │   └── query-post.dto.ts
│   ├── posts.module.ts
│   ├── posts.controller.ts
│   ├── posts.controller.spec.ts
│   ├── posts.service.ts
│   └── posts.service.spec.ts
├── health/health.controller.ts
├── app.module.ts
└── main.ts
```

### 验收清单

```bash
# 1. 启动成功，ConfigModule 校验通过
pnpm start:dev

# 2. Swagger 文档可访问
open http://localhost:3000/api-docs

# 3. 分页正确
curl "http://localhost:3000/posts?page=1&limit=3" | jq .meta

# 4. 搜索
curl "http://localhost:3000/posts?q=NestJS" | jq .

# 5. ValidationPipe 工作（少传必填字段 → 400 详细错误）
curl -X POST http://localhost:3000/posts -H 'Content-Type: application/json' -d '{}'

# 6. 统一错误格式
curl http://localhost:3000/posts/9999

# 7. 控制台有请求日志

# 8. 单元测试通过
pnpm test

# 9. 健康检查
curl http://localhost:3000/health
```

## 提交代码到 GitHub

写一份 README.md，包含：
- 项目描述
- 快速启动命令
- API 接口列表（5个接口）
- 技术栈（NestJS + TypeScript + class-validator）

## 常见坑

1. Swagger `PartialType` 必须从 `@nestjs/swagger` 导入（不是 `@nestjs/mapped-types`）才能继承 `@ApiProperty`
2. ConfigModule 的 Joi 校验会在应用启动时运行，缺少必填环境变量会直接报错退出
3. Logger Middleware 里用 `res.on('finish')` 拿 status，不要在 `next()` 前打印
