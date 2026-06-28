# Day 28 — RBAC 权限控制：复习文档

## 核心知识点

| 层 | 职责 |
|----|------|
| JwtAuthGuard | 验证 Token 是否有效，填充 req.user |
| RolesGuard | 检查 req.user.role 是否在 @Roles 里 |
| Service Owner Check | 检查资源 authorId === currentUser.sub |
| @Public() | 跳过 JWT 验证，公开接口 |
| @CurrentUser() | 参数装饰器，从 req.user 提取 |

## 高频面试题

**Q：RBAC 的角色权限和资源级权限有什么区别？**
RBAC 角色权限（如 admin 才能删）在 Guard 层实现；资源级权限（只能操作自己创建的）在 Service 层实现（需要先查数据库拿到资源的 ownerId 才能比较）。两者组合使用。

**Q：`@Roles()` 放 Controller 类上和方法上有什么区别？**
方法上的 `@Roles` 覆盖类上的（通过 `getAllAndOverride` 的优先级）。适合在类上设默认权限，在特定方法上放宽或收紧。

## 自测题（不看答案）

1. 如何实现「editor 角色可以编辑所有文章，user 只能编辑自己的」？
2. Guard 里返回 `false` 和抛 `UnauthorizedException` 有什么不同？
3. 同时注册了 JwtAuthGuard 和 RolesGuard，执行顺序是什么？

## 下一章建议

Day 29：OAuth2 第三方登录——GitHub/Google OAuth2 流程、Passport.js 策略、回调处理、账号绑定。
