# Day 29 — OAuth2 第三方登录：理论笔记

## OAuth2 流程 ★面试必考

### Authorization Code 流程（最常用）

```
用户点击「GitHub 登录」
  ↓
重定向到 GitHub: GET https://github.com/login/oauth/authorize
  ?client_id=xxx&redirect_uri=https://myapp.com/auth/github/callback&scope=user:email
  ↓
用户在 GitHub 授权
  ↓
GitHub 重定向回: GET /auth/github/callback?code=abc123
  ↓
服务端用 code 换取 access_token: POST https://github.com/login/oauth/access_token
  ↓
服务端用 access_token 获取用户信息: GET https://api.github.com/user
  ↓
服务端在本地创建/查找用户，签发自己的 JWT
  ↓
返回 JWT 给客户端
```

### 四种 Grant Type

| 类型 | 适用场景 |
|------|---------|
| Authorization Code | 服务端应用（最常用，最安全）|
| Authorization Code + PKCE | SPA/移动端（无后端 secret）|
| Client Credentials | 服务器间调用（无用户）|
| Implicit | 已废弃 |

### NestJS + Passport 实现

```bash
pnpm add @nestjs/passport passport passport-github2
pnpm add -D @types/passport-github2
```

**GitHub Strategy**：
```ts
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private usersService: UsersService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get('GITHUB_CLIENT_ID'),
      clientSecret: config.get('GITHUB_CLIENT_SECRET'),
      callbackURL: config.get('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // OAuth 回调后自动调用，profile 是 GitHub 返回的用户信息
    const { id, username, emails, photos } = profile;
    const email = emails?.[0]?.value;

    // 查找或创建用户（账号绑定）
    let user = await this.usersService.findByOAuthId('github', id);
    if (!user) {
      user = await this.usersService.createOAuthUser({
        oauthProvider: 'github',
        oauthId: id,
        email,
        name: username,
        avatar: photos?.[0]?.value,
      });
    }

    return user;  // 挂到 req.user
  }
}
```

**Controller**：
```ts
@Controller('auth')
export class AuthController {
  // 触发 GitHub OAuth 重定向
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {}  // 不需要实现，Passport 自动处理

  // GitHub 回调
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken } = await this.auth.loginWithOAuth(req.user);
    res.cookie('refresh_token', refreshToken, { httpOnly: true });
    // 重定向到前端，携带 AT
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
  }
}
```

### 账号绑定策略

```ts
// 场景：用 GitHub 登录，但邮箱与已有账号相同
async findOrCreateOAuthUser(profile: OAuthProfile) {
  // 1. 先找 oauth_id 匹配的
  let user = await this.prisma.user.findFirst({
    where: { oauthProvider: profile.provider, oauthId: profile.id },
  });
  if (user) return user;

  // 2. 找邮箱匹配的（绑定已有账号）
  if (profile.email) {
    user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: { oauthProvider: profile.provider, oauthId: profile.id },
      });
    }
  }

  // 3. 创建新账号
  return this.prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      oauthProvider: profile.provider,
      oauthId: profile.id,
      passwordHash: null,  // OAuth 用户没有密码
    },
  });
}
```

## 面试高频问题

**Q：OAuth2 解决了什么问题？**
让第三方应用能访问用户在另一个平台的资源，而不需要用户把密码告诉第三方。「授权」而非「认证」。

**Q：Authorization Code 为什么比 Implicit 更安全？**
Implicit 直接把 access_token 返回到 URL fragment（可能泄露在浏览器历史、日志、Referer header）；Authorization Code 先返回 code（短期一次性），code 在服务端换 token，token 不经过浏览器。

**Q：PKCE 是什么？为什么 SPA 需要用？**
PKCE（Proof Key for Code Exchange）：SPA 没有后端，无法安全存储 client_secret。PKCE 用随机生成的 code_verifier + code_challenge 替代 client_secret，保证 code 只能被生成它的客户端使用。

## 常见易错点

- Callback URL 必须和 GitHub OAuth App 配置的完全一致
- `scope` 没有申请 `user:email`，拿不到邮箱
- OAuth 用户没有密码，`passwordHash` 字段允许 null
- 需要在 Prisma schema 里加 `oauthProvider` 和 `oauthId` 字段
