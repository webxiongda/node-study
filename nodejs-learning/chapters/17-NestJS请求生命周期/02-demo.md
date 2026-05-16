# Day 17 — NestJS 请求生命周期：实操 Demo

## Demo 1：Logger Middleware

**目标**：记录每个请求的方法/URL/状态码/耗时，`/health` 不打日志

**src/common/middleware/logger.middleware.ts**：
```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    // 用 res.on('finish') 才能拿到最终 status code
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    });
    next();
  }
}
```

**src/app.module.ts 注册**：
```ts
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({ /* ... */ })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
```

**运行**：
```bash
pnpm start:dev
curl http://localhost:3000/posts
# 控制台：[2026-05-16T...] GET /posts 200 (3ms)

curl http://localhost:3000/health
# 没有日志输出（被 exclude）
```

---

## Demo 2：Transform Interceptor（统一响应封装）

**目标**：所有成功响应自动包成 `{ data, meta: { tookMs } }`

**src/common/interceptors/transform.interceptor.ts**：
```ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta: { tookMs: number };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
    const start = Date.now();
    return next.handle().pipe(
      map(data => ({
        data,
        meta: { tookMs: Date.now() - start },
      })),
    );
  }
}
```

**src/main.ts 全局注册**：
```ts
app.useGlobalInterceptors(new TransformInterceptor());
// ⚠️ 这种方式无法注入依赖，如果 Interceptor 需要注入服务，用 APP_INTERCEPTOR
```

**或者通过模块注册（推荐，可注入依赖）**：
```ts
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
```

**测试效果**：
```bash
curl http://localhost:3000/posts/1
# {"data":{"id":1,"title":"..."},"meta":{"tookMs":2}}

# 错误响应不经过 Interceptor，保持原样
curl http://localhost:3000/posts/9999
# {"statusCode":404,"message":"Post #9999 不存在","error":"Not Found"}
```

---

## Demo 3：JWT Guard + Roles Guard 组合

**目标**：实现需要登录才能访问 + 管理员才能删除的权限控制

```bash
pnpm add @nestjs/jwt
```

**src/common/decorators/roles.decorator.ts**：
```ts
import { SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

**src/common/guards/jwt-auth.guard.ts**：
```ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('缺少 Token');
    try {
      req.user = this.jwt.verify(auth.replace('Bearer ', ''));
      return true;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }
}
```

**src/common/guards/roles.guard.ts**：
```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;  // 没标注 = 公开
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return false;
    return required.some(role => user.roles?.includes(role));
  }
}
```

**Controller 使用**：
```ts
@UseGuards(JwtAuthGuard, RolesGuard)  // Guard 按顺序执行
@Controller('posts')
export class PostsController {
  @Get()
  findAll() { /* 无 @Roles，登录就能访问 */ }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { /* 需要 admin 角色 */ }
}
```

**测试**：
```bash
# 无 Token → 401
curl -X DELETE http://localhost:3000/posts/1
# {"statusCode":401,"message":"缺少 Token"}

# 普通用户 Token（无 admin 角色）→ 403
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer USER_TOKEN"
# {"statusCode":403,"message":"Forbidden resource"}

# 管理员 Token → 204
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
