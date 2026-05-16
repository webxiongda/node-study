# Day 31 — 里程碑：认证系统整合

## 阶段回顾（Day 27-30）

### 完整认证流程图

```
用户注册 → bcrypt hash 密码 → 存库
用户登录 → 验证密码 → 签发 AT(15m) + RT(7d) → RT 存 httpOnly Cookie
请求受保护接口 → Bearer AT → JwtAuthGuard → 验证签名/过期 → req.user
AT 过期 → 携带 RT Cookie → /auth/refresh → 验证 RT → 签发新 AT
用户登出 → 数据库使 RT 失效 → 清除 Cookie
GitHub 登录 → Authorization Code 流程 → 本地账号绑定 → 签发 JWT
```

### 权限检查层级

```
1. JwtAuthGuard：验证 Token 有效性
2. RolesGuard：检查角色（ADMIN/USER）
3. Service Owner Check：检查资源归属（只能操作自己的）
```

## 认证系统自检清单

- [ ] 注册：密码 bcrypt hash（cost=10）
- [ ] 登录：错误信息不区分「用户不存在」和「密码错误」（防枚举）
- [ ] AT 15分钟，RT 7天，用不同的 secret
- [ ] RT 存 httpOnly + SameSite=Strict Cookie
- [ ] 登出时数据库使 RT 失效
- [ ] @Public() 标注公开接口
- [ ] Owner Check 在 Service 层
- [ ] 登录接口有限流（ThrottlerGuard）
- [ ] Helmet 安全 headers
- [ ] CORS 只允许特定域名

## 面试答题模板

**Q：描述你的博客项目的认证系统**

「项目使用 JWT 双 Token 方案：短期 Access Token（15分钟）每次请求携带在 Authorization header，长期 Refresh Token（7天）存在 httpOnly Cookie 里防止 XSS 窃取。用户登出或修改密码时，数据库里的 RT hash 被清除，旧 RT 失效。

密码用 bcrypt（cost=10）不可逆存储，登录接口添加了 ThrottlerGuard 限流（1分钟最多5次）防止暴力破解。

权限控制分三层：JwtAuthGuard 验证 Token，RolesGuard 检查角色，Service 层 Owner Check 验证资源归属。Helmet + CORS 配置保证传输层安全。」
