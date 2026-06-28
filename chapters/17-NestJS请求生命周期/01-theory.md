# Day 17 — NestJS 请求生命周期：理论笔记

## 完整执行顺序 ★面试必考

```
HTTP Request
  ↓ Middleware      — Express 风格，最早，不知道路由元数据
  ↓ Guard           — 鉴权/权限，返回 false → 403
  ↓ Interceptor(pre)— handler 调用前
  ↓ Pipe            — 参数转换 + 校验
  ↓ Handler         — Controller 方法
  ↓ Interceptor(post)— handler 返回后，用 RxJS pipe 处理
  ↓ Exception Filter— 任何层抛异常都跳这里
  ↓ HTTP Response
```

口诀：**「中 → 卫 → 拦(前) → 管 → 控 → 拦(后) → 异」**

**三个关键点**：
1. Interceptor 包住 Pipe 和 Handler（Interceptor 看到的「响应」是 handler 返回值）
2. Filter 不在主流水线上，是异常的兜底捕获
3. Middleware 在 Guard 之前，但拿不到 ExecutionContext（不知道匹配了哪个 handler）

## Middleware

Express 风格，最接近平台层：

```ts
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.url} ${res.statusCode} (${Date.now()-start}ms)`);
    });
    next();
  }
}

// Module 里注册（不是装饰器）
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
```

**适合**：全局日志、helmet/cors/compression、请求体预处理
**不适合**：依赖路由元数据的逻辑（拿不到 ExecutionContext）

## Guard ★面试常考

只回答一个问题：**这个请求能不能继续？**

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('缺少 token');
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('token 无效');
    }
  }
}
```

**Guard vs Middleware**：

| | Middleware | Guard |
|---|---|---|
| 能拿到 ExecutionContext | ❌ | ✅ |
| 知道当前 Controller/Handler | ❌ | ✅ |
| 能读自定义装饰器 | ❌ | ✅ |
| 适合做 | 平台级处理 | 权限决策 |

**Roles 装饰器 + Guard 组合**（RBAC 核心模式）：

```ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!required) return true;  // 没标注 = 公开
    const { user } = ctx.switchToHttp().getRequest();
    return required.some(r => user.roles.includes(r));
  }
}
```

## Interceptor ★面试常考

AOP「环绕通知」，能在 handler 前后插逻辑，能修改返回值：

```ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<{ data: T }> {
    const start = Date.now();
    return next.handle().pipe(
      map(data => ({ data, meta: { tookMs: Date.now() - start } })),
    );
  }
}
```

- `next.handle()` **之前**的代码 = handler 调用前（读缓存、记开始时间）
- `.pipe(...)` 里的操作 = handler 调用后（包装响应、记耗时）
- 想短路 handler → `return of(cachedValue)`

**Interceptor vs Middleware**：Middleware 改不了响应体（`res.send()` 已发），Interceptor 在发送前操作 Observable，能改内容。

## Pipe

两件事：转换类型 + 校验，失败抛 `BadRequestException`（400）。

内置 Pipe：`ParseIntPipe` / `ParseUUIDPipe` / `ParseBoolPipe` / `ValidationPipe` / `DefaultValuePipe`

```ts
// 全局注册（main.ts）
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // 剥离未声明字段
  forbidNonWhitelisted: true, // 多余字段报错
  transform: true,            // query string 数字自动转 number ★重要
}));
```

**`transform: true` 关键**：不开这个，query 里的 `?page=2` 永远是字符串，`@IsInt()` 永远失败。

## Exception Filter

任何层抛异常都跳到这里：

```ts
@Catch()  // 不传参 = 捕获所有
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus() : 500;
    const message = exception instanceof HttpException
      ? exception.getResponse() : '服务器内部错误';
    res.status(status).json({ code: status, message, timestamp: new Date().toISOString() });
  }
}
```

**重要**：Filter 接管后，handler 后面的 `Interceptor.post` 不执行。所以：
- 成功响应封装 → Interceptor
- 错误响应封装 → Filter
两者各管一半，不要混用。

## ExecutionContext

Guard/Interceptor/Filter 的共同上下文对象：

```ts
ctx.switchToHttp().getRequest();   // Express Request
ctx.switchToHttp().getResponse();  // Express Response
ctx.getHandler();                  // 当前 handler 函数
ctx.getClass();                    // 当前 Controller 类
ctx.switchToRpc().getData();       // 微服务模式
```

## 注册粒度（四个级别）

```ts
// 1. 全局（main.ts，不能注入依赖！）
app.useGlobalGuards(new JwtAuthGuard());  // ⚠️ new 时依赖是 undefined

// 2. 全局（通过模块，可注入依赖）★推荐
@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})

// 3. Controller 级
@UseGuards(JwtAuthGuard)
@Controller('posts')

// 4. 方法级
@UseGuards(AdminGuard)
@Delete(':id')
```

## 面试高频问题

**Q：Guard 和 Middleware 的区别？**
Middleware 最早执行，但不知道匹配了哪个路由/handler，拿不到 ExecutionContext；Guard 在 Middleware 之后，能拿到 ExecutionContext，能读自定义装饰器（如 `@Roles()`）。

**Q：Interceptor 的 `next.handle()` 返回什么？**
返回 `Observable`，是 RxJS 流。handler 执行后的返回值通过这个 Observable 传递，可用 `.pipe(map(...))` 改变返回值，用 `of(value)` 短路不调用 handler。

**Q：为什么 `main.ts` 里 `new JwtAuthGuard()` 全局注册会出问题？**
`NestFactory.create()` 阶段容器还没完全初始化，`new JwtAuthGuard()` 时注入的 `JwtService` 是 `undefined`。必须用 `APP_GUARD` provider 注册，让框架从已初始化的容器里取。

**Q：统一响应封装应该写在哪里？**
成功响应 → Interceptor（handler 返回后 `.pipe(map(...))` 包装）。错误响应 → ExceptionFilter。不能都写在 Filter 里，因为 Filter 不处理成功响应；也不能都写在 Interceptor 里，因为异常时 Interceptor.post 不执行。

## 常见易错点

- 在 Middleware 里想读自定义装饰器 → 拿不到，改用 Guard
- `main.ts` 用 `new` 全局注册 Guard → 依赖注入失败
- 统一封装写在 Filter 里 → 成功响应不经过 Filter
- Interceptor 里 `throw new Error()` → 被 RxJS 吞掉，用 `throwError(() => ...)`
- `ValidationPipe` 没开 `transform: true` → query string 数字校验永远失败
