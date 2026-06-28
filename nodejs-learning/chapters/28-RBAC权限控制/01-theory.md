# Day 28 — RBAC 权限控制：理论笔记

## RBAC 模型 ★

**RBAC（Role-Based Access Control）**：用户 → 角色 → 权限。

```
User(alice) → Role(editor) → Permission(post:create, post:update)
User(bob)   → Role(admin)  → Permission(*)
User(carol) → Role(user)   → Permission(post:read, comment:create)
```

### NestJS 实现

**装饰器**：
```ts
// 标注需要的角色
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// 标注公开接口（跳过 JWT 验证）
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 组合装饰器
export const Auth = (...roles: Role[]) =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
```

**JwtAuthGuard（支持 @Public）**：
```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // 公开接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('缺少 Token');
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }
}
```

**RolesGuard**：
```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!roles?.length) return true;  // 没有 @Roles 限制，已登录就可以

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('请先登录');
    return roles.includes(user.role);
  }
}
```

**Controller 使用**：
```ts
@Controller('posts')
export class PostsController {
  // 公开：无需 Token
  @Public()
  @Get()
  findAll() {}

  // 需要登录（任何角色）
  @UseGuards(JwtAuthGuard)
  @Post()
  create() {}

  // 需要 admin 角色
  @Auth(Role.ADMIN)
  @Delete(':id')
  remove() {}
}
```

### 资源级权限（Owner Check） ★

仅拥有者或管理员可操作：

```ts
// posts.service.ts
async update(id: number, dto: UpdatePostDto, currentUser: JwtPayload) {
  const post = await this.prisma.post.findUniqueOrThrow({ where: { id } });

  // 资源级权限检查
  if (post.authorId !== currentUser.sub && currentUser.role !== Role.ADMIN) {
    throw new ForbiddenException('只能修改自己的文章');
  }

  return this.prisma.post.update({ where: { id }, data: dto });
}
```

### 细粒度权限（Permission-Based） ★

比 RBAC 更灵活，适合复杂场景：

```ts
enum Permission {
  POST_CREATE = 'post:create',
  POST_UPDATE_OWN = 'post:update:own',
  POST_UPDATE_ANY = 'post:update:any',
  POST_DELETE = 'post:delete',
  USER_MANAGE = 'user:manage',
}

const rolePermissions = {
  [Role.USER]: [Permission.POST_CREATE, Permission.POST_UPDATE_OWN],
  [Role.EDITOR]: [Permission.POST_CREATE, Permission.POST_UPDATE_ANY],
  [Role.ADMIN]: Object.values(Permission),  // 所有权限
};
```

## 面试高频问题

**Q：RBAC 和 ABAC 的区别？**
RBAC（Role-Based）：用户通过角色获得权限，简单易管理，适合大多数业务；ABAC（Attribute-Based）：基于用户、资源、环境的属性做判断（如：工作时间 + 本部门文档 + 本人创建），更细粒度但更复杂。

**Q：如何实现「用户只能修改自己的资源」？**
在 Service 层（不是 Guard）进行 Owner Check：查到资源后比较 `resource.ownerId === currentUser.id`，不匹配且当前用户不是 admin 则抛 403 ForbiddenException。

**Q：@Public() 装饰器和不加 Guard 的区别？**
不加 Guard：接口真的没有任何认证，代码量少；用 `@Public()`：Guard 仍然运行，能拿到 `req.user`（如果有 token 的话），适合「公开但如果登录了可以个性化」的场景（如文章列表，登录用户可以看到自己的草稿）。

## 常见易错点

- `Reflector.getAllAndOverride` 的两个参数顺序：先 `getHandler()`（方法级），再 `getClass()`（类级），方法级覆盖类级
- Owner Check 放在 Guard 里需要数据库查询，最好放在 Service 里（Guard 里没有业务上下文）
- Guard 返回 false → 403，抛 `UnauthorizedException` → 401，要根据语义选择
