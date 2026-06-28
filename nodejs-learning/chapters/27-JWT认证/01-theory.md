# Day 27 — JWT 认证：理论笔记

## JWT 原理 ★面试必考

### 结构

JWT 由三部分组成，用 `.` 分隔：`Header.Payload.Signature`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    ← Header（Base64）
eyJzdWIiOjEsImVtYWlsIjoiYWxpY2UuLi4ifQ.  ← Payload（Base64）
dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk  ← Signature（HMAC-SHA256）
```

**Header**：`{ "alg": "HS256", "typ": "JWT" }`
**Payload**：`{ "sub": 1, "email": "alice@example.com", "roles": ["user"], "iat": 1234, "exp": 1234+3600 }`
**Signature**：`HMAC_SHA256(base64(header) + "." + base64(payload), secret)`

### 验证流程

1. 客户端登录 → 服务端验证密码 → 签发 JWT → 返回 token
2. 客户端请求时带 `Authorization: Bearer <token>`
3. 服务端：Base64 解码 Header/Payload → 重新计算签名 → 对比 → 检查 `exp` → 放行

**无状态**：服务端不存 session，可水平扩展。

### Access Token + Refresh Token ★

```
Access Token：短期（15分钟~1小时），每次请求携带
Refresh Token：长期（7~30天），只在续期时使用，存 httpOnly Cookie
```

续期流程：
```
Access Token 过期 → 携带 Refresh Token 请求 /auth/refresh
→ 服务端验证 RT 有效 → 签发新 AT（可选：滚动更新 RT）
```

Refresh Token 失效的情况：
- 过期
- 用户主动登出（服务端把 RT 加入黑名单，需要 Redis 存储）
- 密码被修改（旧 RT 应该全部失效）

### NestJS 实现 ★

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
pnpm add -D @types/passport-jwt @types/bcrypt
```

**auth.service.ts**：
```ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('邮箱或密码错误');

    const payload = { sub: user.id, email: user.email, roles: [user.role] };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: user.id }, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    // 存 Refresh Token hash 到数据库（用于黑名单验证）
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.usersService.findOne(payload.sub);
      // 验证 RT 是否匹配数据库存储的（黑名单机制）
      const rtValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!rtValid) throw new UnauthorizedException('Refresh Token 无效');

      const newPayload = { sub: user.id, email: user.email, roles: [user.role] };
      return {
        accessToken: this.jwtService.sign(newPayload, { expiresIn: '15m' }),
      };
    } catch {
      throw new UnauthorizedException('Refresh Token 已过期或无效');
    }
  }
}
```

**jwt-auth.guard.ts**（复用 Day 17 的实现）：
```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('缺少 Access Token');
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch (e) {
      if (e.name === 'TokenExpiredError') throw new UnauthorizedException('Token 已过期');
      throw new UnauthorizedException('Token 无效');
    }
  }
}
```

### 密码安全 ★

```ts
// 存储时 bcrypt hash（不可逆）
const hash = await bcrypt.hash(plainPassword, 10);  // cost factor = 10

// 验证
const valid = await bcrypt.compare(plainPassword, hash);

// 不要用 MD5/SHA1 存密码（可暴力破解）
// 不要用可逆加密
// Cost factor 越高越安全，但越慢（10是合理值，耗时约100ms）
```

## 面试高频问题

**Q：JWT 的安全隐患是什么？**
(1) secret 泄露 → 所有 token 失效，可伪造任意用户；(2) token 无法主动吊销（无状态）→ 用 Refresh Token + Redis 黑名单解决；(3) payload 不加密（只是 Base64 编码）→ 不要在 payload 里存敏感信息；(4) 不验证 `alg: none` 攻击 → 始终明确指定算法。

**Q：Access Token 和 Refresh Token 各存在哪里？**
Access Token：存在内存（前端变量/Redux store），每次请求放 Authorization header；Refresh Token：存 httpOnly Cookie（JS 无法读取，防 XSS）或安全存储（React Native 用 SecureStore）。

**Q：用户修改密码后，如何让所有旧 Token 失效？**
在用户表里存一个 `tokenVersion` 字段，每次修改密码时 +1；JWT payload 里带 `version`；验证时检查 `payload.version === user.tokenVersion`，不匹配则拒绝。

**Q：JWT 和 Session 的区别？**
Session：服务端存状态，有状态，需要共享存储（Redis）才能水平扩展，但可以随时吊销；JWT：客户端存 token，无状态，天然支持水平扩展，但无法主动吊销（只能等过期）。

## 常见易错点

- 不区分 Access Token 和 Refresh Token 的 secret（应该用不同的 secret）
- Refresh Token 存明文到数据库（应存 hash）
- token 过期报错没有区分 `TokenExpiredError` 和其他错误
- bcrypt `compare` 异步，忘了 await
