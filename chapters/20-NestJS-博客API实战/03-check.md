# Day 20 — NestJS 博客 API 实战：验收自测

---

## 题 1（概念）

关于 `ConfigModule.forRoot({ isGlobal: true })`，以下哪些说法正确？

A. 设置后，所有模块都无需 import ConfigModule 就可以注入 ConfigService
B. 需要在每个使用 ConfigService 的模块都 import ConfigModule
C. 环境变量校验失败时，应用启动会报错退出
D. 可以用 `config.get('PORT', 3000)` 设置默认值

---

## 题 2（代码题）

以下分页计算有什么 bug？

```ts
findAll(page: number, limit: number, items: any[]) {
  const data = items.slice(page * limit, (page + 1) * limit);
  const totalPages = Math.ceil(items.length / limit);
  return { data, meta: { total: items.length, page, totalPages } };
}
// 调用：findAll(1, 10, items) // 想获取第1页
```

---

## 题 3（实操题）

实现一个 `SearchPostsDto`，支持：
- `q`：搜索关键词，可选
- `page`：页码，默认 1，最小 1
- `limit`：每页条数，默认 20，最大 50
- `status`：枚举筛选，可选
- `sortBy`：排序字段，只能是 `'createdAt'` 或 `'title'`，可选
- `order`：排序方向，`'asc'` 或 `'desc'`，默认 `'desc'`

---

## 题 4（设计题）

为博客 API 设计统一的响应格式，包含：
- 成功列表响应（带分页）
- 成功单个资源响应
- 错误响应

写出三种响应的 JSON 格式示例。

---

## 题 5（业务场景）

博客 API 上线后发现一个问题：某用户传入 `{"title": "test", "isAdmin": true}` 试图篡改权限。

1. 哪个 ValidationPipe 配置可以防止这个问题？
2. 如果用户传入的 `title` 包含 `<script>` 标签，ValidationPipe 能防止 XSS 吗？如果不能，还需要什么处理？

---

## 参考答案

### 题 1：A、C、D

- A 正确：`isGlobal: true` 相当于在根模块注册，所有子模块自动可用
- B 错：正是 `isGlobal` 的意义在于不需要每个模块都 import
- C 正确：Joi 校验失败时抛异常，应用无法启动
- D 正确

### 题 2

Bug：分页从 0 开始（第1页是 `page=1`），但代码里 `page * limit` 假设从 0 开始。

- `findAll(1, 10, items)` 会 `slice(10, 20)`，跳过了第一页
- 正确应该是 `slice((page - 1) * limit, page * limit)`

修复：
```ts
const data = items.slice((page - 1) * limit, page * limit);
```

### 题 3

```ts
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder { ASC = 'asc', DESC = 'desc' }
export enum SortField { CREATED_AT = 'createdAt', TITLE = 'title' }

export class SearchPostsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
```

### 题 4

**成功列表响应（带分页）**：
```json
{
  "data": [
    {"id": 1, "title": "...", "author": "..."}
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**成功单个资源响应**：
```json
{
  "data": {
    "id": 1,
    "title": "NestJS 入门",
    "content": "...",
    "author": "Tom",
    "createdAt": "2026-05-16T..."
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "code": "POST_NOT_FOUND",
  "message": "Post #99 不存在",
  "path": "/posts/99",
  "timestamp": "2026-05-16T..."
}
```

### 题 5

1. `whitelist: true` 会静默剥离 `isAdmin`（DTO 未声明字段）；`forbidNonWhitelisted: true` 会直接报 400 告知客户端传了非法字段。

2. `ValidationPipe` 的 `@IsString()` 只验证类型和格式，**不做 XSS 防护**。`<script>` 作为字符串会通过 `@IsString()` 校验。

防止 XSS 的正确方法：
- 存储时用 `sanitize-html` 或 `DOMPurify`（服务端）净化 HTML
- 响应时，前端框架（React/Vue）默认转义 HTML 实体
- 若要允许 HTML 内容，在存储前用白名单过滤允许的标签
