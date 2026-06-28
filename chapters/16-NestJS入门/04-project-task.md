# Day 16 — 项目任务：博客文章 CRUD API

## 业务背景

你要为一个博客平台搭建后端 API。本阶段先用内存数组存储数据（下一阶段接真实数据库），重点是验证 NestJS 的 Module/Controller/Service 架构是否理解到位。

## 技术要求

- NestJS + TypeScript
- 模块化结构：`PostsModule`（独立模块，不写在 AppModule）
- 全局 `ValidationPipe`（`whitelist: true, transform: true`）
- DTO 校验（class-validator）
- 正确的 HTTP 方法 + 状态码

## 接口规格

| 方法 | 路径 | 描述 | 成功状态码 |
|------|------|------|-----------|
| GET | /posts | 获取文章列表（支持 `?author=xxx` 筛选） | 200 |
| GET | /posts/:id | 获取单篇文章 | 200 |
| POST | /posts | 创建文章 | 201 |
| PATCH | /posts/:id | 更新文章（部分更新） | 200 |
| DELETE | /posts/:id | 删除文章 | 204 |

## DTO 要求

`CreatePostDto`：
- `title`：string，必填，最少 2 字符
- `content`：string，必填
- `author`：string，必填

`UpdatePostDto`：
- 所有字段可选（可用 `PartialType(CreatePostDto)`）

## 验收标准

```bash
# 1. 创建文章 → 201
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"NestJS学习","content":"IoC真好用","author":"小明"}'

# 2. 少传字段 → 400/422，且有详细校验错误信息
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"x"}'

# 3. 按作者筛选
curl "http://localhost:3000/posts?author=小明"

# 4. 获取不存在的文章 → 404，有 message
curl http://localhost:3000/posts/9999

# 5. 传非数字 id → 400
curl http://localhost:3000/posts/abc

# 6. 删除 → 204 No Content（响应体为空）
curl -X DELETE http://localhost:3000/posts/1 -v
```

## 常见坑

1. **忘记在 AppModule 里 import PostsModule** — 路由不生效，404 所有请求
2. **Controller 里写了 `if/else` 业务逻辑** — 应该全部在 Service 里
3. **`@Delete` 方法还在 return 数据** — DELETE 成功应该 `@HttpCode(204)` + 不 return 内容
4. **ValidationPipe 没在 main.ts 全局注册** — DTO 装饰器不生效
5. **PartialType 需要从 `@nestjs/mapped-types` 导入** — 不是 class-transformer 里的
