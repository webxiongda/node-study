# Day 16 — NestJS 入门：复习文档

## 核心知识点总结

| 概念 | 一句话描述 |
|------|-----------|
| IoC | 对象创建/组装权交给框架容器，业务代码只声明需要什么 |
| DI | IoC 的实现方式：通过构造函数注入依赖 |
| 装饰器 | 类定义时执行一次，写元数据；Nest 启动时读取元数据构造依赖图 |
| Module | 应用的装配清单，声明谁在场、边界在哪 |
| Controller | HTTP 请求翻译层，只调用 Service，不写业务 |
| Service | 业务逻辑的家，@Injectable() 注册到容器 |
| 单例 | Provider 默认作用域，应用内共享同一实例 |

## 易错点

- `exports` 忘了写 → 跨模块注入失败（最高频错误）
- interface 作为注入类型 → 编译后擦除，运行时报错
- `new SomeService()` → 绕过容器，失去单例
- `@Res()` 后忘记处理 → Interceptor/Filter 失效
- `Scope.REQUEST` 传染依赖链 → 性能问题

## 高频面试题

**Q1：解释 IoC 和 DI 的区别**
IoC（控制反转）是思想，把对象生命周期的控制权从调用者转给框架；DI（依赖注入）是 IoC 的实现方式，通过构造函数参数声明依赖，由容器自动注入。

**Q2：NestJS 的装饰器是怎么工作的？**
装饰器是普通函数，在类定义时执行一次。`@Injectable()` 用 `Reflect.defineMetadata` 在类上写元数据。Nest 启动时遍历 Module 注册的类，读取 `design:paramtypes` 元数据，递归解析每个依赖，构造出完整实例图。

**Q3：Module 的 providers 和 imports 有什么区别？**
`providers` 把一个类注册到本模块的 IoC 容器（本模块内可注入）；`imports` 声明本模块要用哪些其他模块——可以获得那些模块 `exports` 出来的 provider。

**Q4：为什么 Provider 默认是单例？有什么好处？**
Nest 启动时构造一次，所有依赖它的地方共享同一实例。好处：数据库连接、Redis 客户端等昂贵对象不需要重复创建；无状态 Service 天然线程安全。

**Q5：什么情况下会用 `Scope.REQUEST`？有什么代价？**
需要每个请求有独立状态时（如多租户上下文、追踪当前用户）。代价：传染依赖链——依赖它的 provider 都跟着变成请求作用域，每个请求重建整条链路，性能大幅下降。能用 `AsyncLocalStorage` 传递上下文就不用 REQUEST scope。

**Q6：@Controller 里能不能写业务逻辑？**
不应该。Controller 的职责是「翻译」——把 HTTP 请求翻译成方法调用，把方法返回值翻译成响应。业务逻辑（条件判断、数据计算、持久化）都应在 Service 里。

## 自测题（不看答案）

1. `providers: [UserService]` 和 `exports: [UserService]` 的区别？
2. 为什么不能把 TypeScript interface 作为依赖注入的类型？
3. 用 `nest g resource posts` 会生成哪些文件？
4. 全局 `ValidationPipe` 应该在哪里注册？

## 下一章建议

Day 17 深入请求生命周期：Middleware → Guard → Interceptor → Pipe → Handler → Filter。重点是：
- Guard 怎么做 JWT 鉴权
- Interceptor 怎么做统一响应封装
- 为什么 `main.ts` 里 `new JwtAuthGuard()` 全局注册会出问题
