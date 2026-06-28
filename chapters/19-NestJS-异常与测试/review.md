# Day 19 — NestJS 异常处理与测试：复习文档

## 核心知识点总结

**异常处理层级**：
```
Service 抛 HttpException → ExceptionFilter 格式化 → 统一响应
Service 抛裸 Error → ExceptionFilter 兜底 → 500
```

**测试三层**：
```
单元测试（spec.ts）→ mock 依赖，测业务逻辑
集成测试（e2e-spec.ts）→ 真实 HTTP，测完整流程
```

## 易错点

- `@Catch(HttpException)` 不能捕获非 HTTP 异常（数据库错误等）
- Filter 里 `exception.message` vs `exception.getResponse()` — 后者包含 ValidationPipe 的字段错误
- Mock 函数调用记录跨测试污染 → `jest.clearAllMocks()` 放在 `afterEach`
- 异步断言忘了 `await` → 断言不执行，测试假通过
- `createTestingModule` 里 `useValue` mock 的对象方法需要是 `jest.fn()`

## 高频面试题

**Q1：NestJS 里如何优雅处理 Prisma 的唯一约束冲突？**
创建一个 `@Catch(PrismaClientKnownRequestError)` 的 Filter，检查 `exception.code === 'P2002'` 返回 409，`P2025` 返回 404。通过多个 Filter 分别处理不同异常源，用全局 `@Catch()` 兜底。

**Q2：NestJS 单元测试和 E2E 测试的区别？**
单元测试用 `TestingModule` 隔离单个 Service/Controller，mock 所有依赖，速度快；E2E 测试启动完整应用，用 supertest 发 HTTP 请求，验证完整请求链路，速度慢但更真实。

**Q3：如何在 NestJS 中 mock 一个依赖服务？**
在 `Test.createTestingModule` 的 `providers` 里用 `{ provide: ServiceClass, useValue: mockObject }` 替换。`mockObject` 里的方法用 `jest.fn()` 创建，方便后续用 `toHaveBeenCalledWith` 断言。

**Q4：自定义业务异常应该继承哪个类？**
继承 `HttpException`，在构造函数里传入 `{ message, code }` 作为响应体，`statusCode` 作为 HTTP 状态码。这样 ExceptionFilter 可以统一用 `instanceof HttpException` 判断并格式化。

## 自测题（不看答案）

1. `@Catch()` 和 `@Catch(HttpException)` 有什么区别？
2. 如何让 ValidationPipe 的校验错误信息出现在统一格式的 `message` 字段里？
3. `jest.fn().mockReturnValue(x)` 和 `jest.fn().mockResolvedValue(x)` 的区别？
4. 测试一个有 5 个依赖的 Service，需要 mock 多少个对象？

## 下一章建议

Day 20：NestJS 博客 API 实战——用 Day 16-19 所学知识把博客 API 做成完整的：Module 结构规范、完整 CRUD + 搜索 + 分页、Swagger 文档生成、环境变量配置（ConfigModule）。这是阶段二的里程碑。
