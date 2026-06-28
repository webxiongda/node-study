# Day 17 — NestJS 请求生命周期：验收自测

---

## 题 1（概念）

请按正确顺序填写 NestJS 请求生命周期的六层：

```
HTTP Request → _____ → _____ → _____ → _____ → Handler → _____ → _____ → HTTP Response
```

---

## 题 2（概念）

以下说法哪些正确？（多选）

A. Middleware 能读取 `@Roles()` 等自定义装饰器的元数据
B. 在 `main.ts` 用 `app.useGlobalGuards(new JwtAuthGuard())` 注册时，JwtAuthGuard 构造函数注入的 JwtService 可能是 undefined
C. Interceptor 可以短路 handler 不调用它，直接返回缓存数据
D. Exception Filter 接管后，Interceptor 的 post 阶段仍然会执行
E. `ValidationPipe` 不开 `transform: true` 时，query string 里的数字仍然是字符串类型

---

## 题 3（代码题）

找出以下代码的问题并修复：

```ts
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalGuards(new JwtAuthGuard(new JwtService({ secret: 'key' })));
  await app.listen(3000);
}
```

---

## 题 4（代码题）

实现一个 `TimeoutInterceptor`，当 handler 超过 3000ms 未返回时，自动抛出 `RequestTimeoutException`。

```ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 实现
  }
}
```

---

## 题 5（业务场景）

你正在开发一个 API，需要：
1. 所有 `/admin/*` 接口只有 admin 角色才能访问
2. 所有成功响应统一包成 `{ success: true, data: ... }`
3. 所有错误响应统一包成 `{ success: false, code: xxx, message: '...' }`

问：这三个需求分别应该用哪一层（Middleware/Guard/Interceptor/Filter）实现？为什么？

---

## 参考答案

### 题 1

```
HTTP Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Exception Filter → HTTP Response
```

### 题 2：B、C、E

- A 错：Middleware 拿不到 ExecutionContext，无法读自定义装饰器
- B 正确：`NestFactory.create()` 阶段容器未完全初始化，`new JwtAuthGuard()` 时注入为 undefined
- C 正确：`return of(cachedData)` 短路，不调用 `next.handle()`
- D 错：Filter 接管后，Interceptor post 不执行
- E 正确：`transform: true` 才会调用 class-transformer 做类型转换

### 题 3

问题：在 `main.ts` 里 `new JwtAuthGuard(new JwtService(...))` — 手动构造服务，脱离了 DI 容器，JwtService 的配置和其他依赖都需要手动处理，也无法享受容器管理的单例。

修复方案（通过模块注册）：
```ts
// app.module.ts
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({ secret: 'key', signOptions: { expiresIn: '1d' } })],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
// main.ts 里不需要 useGlobalGuards
```

### 题 4

```ts
import { timeout, catchError } from 'rxjs/operators';
import { throwError, TimeoutError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(3000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('请求超时'));
        }
        return throwError(() => err);
      }),
    );
  }
}
```

### 题 5

1. **admin 权限控制 → Guard**
   Guard 能读 `@Roles()` 元数据，在 handler 之前拦截，适合权限决策。可以在 `/admin` 路由的 Controller 上加 `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`。

2. **成功响应统一封装 → Interceptor**
   Interceptor 的 post 阶段能拿到 handler 返回值（Observable），用 `.pipe(map(data => ({ success: true, data })))` 包装。

3. **错误响应统一封装 → ExceptionFilter**
   任何层抛异常都跳到 Filter。Filter 里统一格式化为 `{ success: false, code, message }`。
   不能用 Interceptor 处理错误响应，因为异常时 Interceptor post 阶段不执行。
