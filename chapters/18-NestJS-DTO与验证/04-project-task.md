# Day 18 — 项目任务：完善博客 API 的 DTO 层

## 业务背景

在已有的博客 API 上，加入完整的 DTO 校验层。保证所有传入数据都经过严格校验，所有响应数据不泄露敏感信息。

## 技术要求

1. 为所有接口实现完整 DTO（使用 class-validator + class-transformer）
2. 实现查询 DTO（分页 + 筛选），query string 数字自动转换
3. `UpdatePostDto` 用 `PartialType` 复用 `CreatePostDto`
4. 实现 `PostResponseDto` 排除内部字段（如 `internalNotes`）

## DTO 规格

**CreatePostDto**：
- `title`：string，必填，2-100 字符
- `content`：string，必填，最少 10 字符
- `author`：string，必填
- `status`：enum（draft/published），可选，默认 draft
- `tags`：string 数组，可选，每个 tag 最多 20 字符

**QueryPostDto**（query string）：
- `page`：整数，最小 1，默认 1
- `limit`：整数，1-50，默认 10
- `author`：string，可选
- `status`：enum，可选

**PostResponseDto**（响应）：
- 包含所有公开字段
- 排除 `internalNotes` 字段

## 验收标准

```bash
# 1. 完整合法请求 → 201
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"完整测试文章","content":"内容至少十个字符","author":"测试员","tags":["test"]}'

# 2. content 太短 → 400，有明确错误信息
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"标题","content":"短","author":"x"}'

# 3. 分页 query 自动转 number
curl "http://localhost:3000/posts?page=2&limit=5&status=published"
# page 应该是数字 2，不是字符串 "2"

# 4. limit 超过 50 → 400
curl "http://localhost:3000/posts?limit=999"

# 5. PATCH 只传 title → 200（PartialType 效果）
curl -X PATCH http://localhost:3000/posts/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"只更新标题"}'

# 6. 响应中没有 internalNotes 字段
```

## 常见坑

1. 忘了开 `transform: true`，query string 数字校验失败
2. `PartialType` 导入路径错误（应该是 `@nestjs/mapped-types`）
3. `@IsArray()` + `@IsString({ each: true })` 顺序：先 `@IsArray()` 再 `@IsString({ each: true })`
4. `ClassSerializerInterceptor` 需要拿到 `Reflector` 才能全局注册
5. `@Exclude()` 不会在没有 `ClassSerializerInterceptor` 的情况下自动生效
