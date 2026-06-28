# Day 19 — 项目任务：完善异常处理 + 编写单元测试

## 业务背景

博客 API 目前遇到异常时，响应格式不统一，有时是 NestJS 默认格式，有时是裸错误信息。需要统一异常格式，并为核心逻辑补充单元测试。

## 任务一：统一异常处理

1. 创建 `AppException` 异常基类和若干业务异常
2. 实现全局 `GlobalExceptionFilter`，统一格式：
   ```json
   { "success": false, "code": "POST_NOT_FOUND", "message": "...", "path": "/posts/99", "timestamp": "..." }
   ```
3. 生产环境（`NODE_ENV=production`）的 500 错误不暴露错误详情

## 任务二：PostsService 单元测试

覆盖以下用例（`posts.service.spec.ts`）：
- `findAll()` 初始返回空数组
- `findAll({ author: 'Tom' })` 只返回该作者的文章
- `findOne(id)` 找到返回正确对象
- `findOne(999)` 抛 `ResourceNotFoundException`
- `create(dto)` 创建成功，返回包含 id 的对象
- `update(id, dto)` 更新后字段反映变更
- `remove(id)` 删除后 findOne 抛异常

## 任务三：PostsController 单元测试

Mock PostsService，覆盖：
- `GET /posts` 调用了 `service.findAll`
- `POST /posts` 调用了 `service.create` 并传入正确 dto
- `DELETE /posts/:id` 调用了 `service.remove`

## 验收标准

```bash
# 运行测试，所有用例通过
pnpm test
# 覆盖率报告
pnpm test:cov

# Service 覆盖率 >= 80%
# 异常时响应格式统一
curl http://localhost:3000/posts/9999
# {"success":false,"code":"POST_NOT_FOUND","message":"Post #9999 不存在","path":"/posts/9999","timestamp":"..."}
```

## 常见坑

1. 测试文件命名必须是 `*.spec.ts`，Jest 才会扫描
2. `beforeEach` 里必须重建 module，否则 mock 状态会污染测试
3. `afterEach(() => jest.clearAllMocks())` — 清除 mock 调用记录
4. 测试异步代码时，`expect(promise).rejects.toThrow()` 必须 `await`，否则断言不生效
5. Filter 测试需要 mock `ArgumentsHost`，略复杂，优先测 Service 和 Controller
