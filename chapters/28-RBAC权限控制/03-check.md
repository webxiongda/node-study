# Day 28 — RBAC 权限控制：验收自测

## 题 1（概念）

`Reflector.getAllAndOverride` 的第二个参数是 `[ctx.getHandler(), ctx.getClass()]`，为什么顺序是先 handler 后 class？

## 题 2（代码题）

以下 Guard 有什么问题？

```ts
canActivate(ctx: ExecutionContext) {
  const roles = this.reflector.get<string[]>('roles', ctx.getHandler());
  if (!roles) return false;  // 没有 @Roles 就拒绝
  const { user } = ctx.switchToHttp().getRequest();
  return roles.includes(user.role);
}
```

## 题 3（设计题）

如何实现「用户可以看到自己的草稿文章，其他人只能看已发布的文章」？

## 题 4（代码题）

实现一个 `@CurrentUser()` 参数装饰器，从 `req.user` 里提取当前用户：

```ts
@Get('profile')
@UseGuards(JwtAuthGuard)
profile(@CurrentUser() user: JwtPayload) {
  return user;
}
```

## 参考答案

**题 1**：`getAllAndOverride` 返回第一个找到非 undefined 的值。方法级（handler）优先于类级（class），所以方法上的 `@Roles` 会覆盖类上的 `@Roles`，符合「局部覆盖全局」的直觉。

**题 2**：
- 没有 `@Roles` 时返回 `false`（过于严格，应该是 `return true`——已登录即可）
- 没有检查 `user` 是否存在（JwtAuthGuard 必须在 RolesGuard 之前运行，但防御性编程应检查）
- `this.reflector.get` 只取 handler 级，忽略了 class 级的 `@Roles`（应用 `getAllAndOverride`）

**题 3**：
```ts
async findAll(query: QueryPostDto, currentUser?: JwtPayload) {
  const where = currentUser
    ? {
        OR: [
          { status: 'PUBLISHED' },
          { status: 'DRAFT', authorId: currentUser.sub },  // 自己的草稿
        ],
      }
    : { status: 'PUBLISHED' };  // 未登录只看已发布

  return this.prisma.post.findMany({ where });
}
```

Controller 里：JwtAuthGuard 全局注册但 `@Public()` 的接口仍然会尝试解析 token；如果有 token 就填充 `req.user`，没有则 `req.user` 为 undefined。

**题 4**：
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// 使用
@Get('profile')
profile(@CurrentUser() user: JwtPayload) { return user; }
// 或只取某个字段
@Get('my-posts')
myPosts(@CurrentUser('sub') userId: number) { ... }
```
