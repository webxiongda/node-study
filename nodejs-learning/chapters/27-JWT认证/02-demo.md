# Day 27 — JWT 认证：实操 Demo

## Demo：完整 JWT 认证流程

### 模块配置

```ts
// auth.module.ts
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtAuthGuard, AuthService],
})
export class AuthModule {}
```

### 登录接口

```ts
// auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.auth.login(dto.email, dto.password);

    // Refresh Token 存 httpOnly Cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7天
    });

    return { accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('缺少 Refresh Token');
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user.sub);
    res.clearCookie('refresh_token');
    return { message: '已退出登录' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Req() req: Request) {
    return req.user;
  }
}
```

### 测试

```bash
# 安装 cookie-parser
pnpm add cookie-parser

# 登录
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123456"}' \
  -c cookies.txt -v
# 返回：{ "accessToken": "eyJ..." }
# Cookie 里有 refresh_token

# 用 Access Token 访问受保护接口
TOKEN="eyJ..."
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# 续期 Access Token
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt

# 登出
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt
```
