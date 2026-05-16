# Day 17 — NestJS 请求生命周期：复习文档

## 核心知识点总结

**六层顺序（必背）**：
```
Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → ExceptionFilter
```

| 层 | 职责 | 能拿 ExecutionContext | 适合做 |
|---|------|---------------------|-------|
| Middleware | 平台级处理 | ❌ | 日志、cors、helmet |
| Guard | 鉴权/权限决策 | ✅ | JWT验证、角色控制 |
| Interceptor | 环绕通知 | ✅ | 响应封装、缓存、超时、审计 |
| Pipe | 参数转换+校验 | ✅ | 类型转换、DTO 验证 |
| ExceptionFilter | 异常兜底格式化 | ✅ | 统一错误响应格式 |

## 易错点

- Middleware 想读装饰器元数据 → 拿不到，改 Guard
- `main.ts` `new Guard()` → 依赖注入失败，用 `APP_GUARD`
- 成功封装写 Filter → 成功响应不经 Filter
- 错误封装写 Interceptor → 异常时 post 阶段不执行
- Interceptor 里 `throw Error` → RxJS 吞掉，用 `throwError(() => ...)`
- `ValidationPipe` 没开 `transform: true` → query 数字失败

## 高频面试题

**Q1：描述 NestJS 请求生命周期的完整顺序**
Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → ExceptionFilter。任何一层抛异常都会跳到 Filter。

**Q2：Guard 和 Middleware 做鉴权有什么区别？为什么应该用 Guard？**
Middleware 不知道匹配了哪个 handler，拿不到 ExecutionContext，无法读 `@Roles()` 等自定义装饰器。Guard 知道当前的 Controller 和 handler，能通过 Reflector 读取元数据做精细化权限控制。

**Q3：Interceptor 的 `next.handle()` 为什么返回 Observable？**
NestJS 内部用 RxJS 传递 handler 的执行结果，让 Interceptor 能用 RxJS 操作符（`map/tap/catchError/timeout`）对响应流做处理，支持同步/异步/流式三种场景。

**Q4：`APP_GUARD` 和 `main.ts` 里 `useGlobalGuards` 的区别？**
`main.ts` 里 `new Guard()` 在容器初始化完成前构造，构造函数注入的服务是 undefined。`APP_GUARD` 在模块内注册，框架从已初始化的容器取实例，依赖注入正常工作。

**Q5：为什么统一响应封装要用 Interceptor 而不是 Filter？**
Filter 只在异常时触发，正常请求不经过 Filter；Interceptor 的 post 阶段在 handler 成功返回后执行，可以用 `map(data => ({ data }))` 包装。错误格式化归 Filter 管，成功格式化归 Interceptor 管。

**Q6：如何实现某些接口跳过 JWT 鉴权（公开接口）？**
用 `SetMetadata('isPublic', true)` 创建 `@Public()` 装饰器；在 JwtAuthGuard 的 `canActivate` 里用 `Reflector.getAllAndOverride('isPublic', [...])` 检查，是 true 则直接放行。

## 自测题（不看答案）

1. Interceptor 里如何实现「3秒超时自动 408」？
2. `@Catch(PrismaClientKnownRequestError)` 和 `@Catch()` 都注册了，哪个优先匹配？
3. 一个请求同时触发了 ValidationPipe 的校验失败，会走到哪一层？
4. 全局 Guard、Controller 级 Guard、方法级 Guard 同时存在时，执行顺序是？

## 下一章建议

Day 18：DTO 与数据验证——`class-validator` 所有常用装饰器、`class-transformer` 的 `@Type/@Transform/@Exclude`、`PartialType/PickType/OmitType` 的用法。重点是 `ValidationPipe` 的 `transform: true` 配合 `@Type(() => Number)` 的组合。
