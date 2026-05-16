# Day 30 — Web 安全：理论笔记

## XSS（跨站脚本攻击）★面试必考

**原理**：攻击者把恶意脚本注入到网页，其他用户浏览时脚本在他们浏览器执行。

**三种类型**：
- **存储型**：恶意脚本存入数据库（如评论里注入 `<script>`），危害最大
- **反射型**：恶意脚本在 URL 参数里，后端直接返回到页面
- **DOM型**：前端 JS 不安全地处理 URL 参数（`innerHTML = url_param`）

**防御**：
1. 前端框架默认转义（React/Vue 自动转义 `{variable}`，不要用 `dangerouslySetInnerHTML`）
2. 服务端：`Content-Security-Policy` header（CSP）
3. 存储用户输入的 HTML：用 `sanitize-html` 白名单过滤
4. Cookie 设置 `httpOnly`（防止 XSS 窃取 Cookie）

## CSRF（跨站请求伪造）★面试必考

**原理**：用户登录 A 网站，被诱导访问攻击者的 B 网站，B 网站自动发送请求到 A（浏览器自动带上 Cookie）。

**防御**：
1. **SameSite Cookie**（现代浏览器最有效）：`SameSite=Strict`/`Lax` 阻止跨站携带 Cookie
2. **CSRF Token**：表单里嵌入服务端生成的随机 Token，验证请求合法性
3. **验证 Origin/Referer header**
4. 不用 Cookie 而用 Authorization header 传 Token（前端存 localStorage，CSRF 无法访问）

## SQL 注入 ★

**原理**：用户输入被拼接进 SQL 语句，改变查询语义。

```sql
-- 脆弱代码（字符串拼接）
SELECT * FROM users WHERE email = '${email}'

-- 攻击：输入 email = "' OR '1'='1"
SELECT * FROM users WHERE email = '' OR '1'='1'  -- 返回所有用户
```

**防御**：
1. 使用参数化查询（ORM/Prepared Statement）
2. Prisma 自动参数化：`where: { email: userInput }` 是安全的
3. 避免 `$queryRaw` 里拼接字符串（用模板字面量 `Prisma.sql` 代替）

```ts
// ❌ 危险
await prisma.$queryRaw`SELECT * FROM users WHERE email = '${email}'`;

// ✅ 安全（Prisma 自动转义）
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

## SSRF（服务端请求伪造）

**原理**：攻击者控制服务端发起的 HTTP 请求，让服务端请求内网资源。

**防御**：
- 验证 URL 不是内网地址（127.0.0.1, 10.x.x.x, 172.16.x.x, 192.168.x.x）
- 用白名单限制可请求的域名

## NestJS 安全配置 ★

```bash
pnpm add helmet @nestjs/throttler
```

```ts
// main.ts
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Helmet（设置安全相关 HTTP headers）
  app.use(helmet());

  // 2. CORS 配置
  app.enableCors({
    origin: ['http://localhost:4200', 'https://myapp.com'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,  // 允许携带 Cookie
  });

  // 3. Cookie 解析
  app.use(cookieParser());

  // 4. 全局限流（在 AppModule 里）
  // ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])
  // 每 60 秒最多 100 次请求
}
```

**ThrottlerGuard（限流）**：
```ts
// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 时间窗口（毫秒）
      limit: 100,   // 最大请求数
    }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})

// 特定接口自定义限流
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 1分钟最多5次
@Post('auth/login')
login() {}

// 跳过限流
@SkipThrottle()
@Get('health')
health() {}
```

**Helmet 设置的关键 Headers**：
- `X-Content-Type-Options: nosniff`：防 MIME 类型嗅探
- `X-Frame-Options: DENY`：防点击劫持
- `Strict-Transport-Security`：强制 HTTPS
- `Content-Security-Policy`：控制资源加载来源

## 面试高频问题

**Q：XSS 和 CSRF 的区别？**
XSS：攻击者在页面注入脚本，以当前用户身份执行（需要在用户浏览器运行代码）；CSRF：攻击者诱导用户访问恶意页面，浏览器自动带 Cookie 发请求到目标网站（不需要 JS 执行权限）。

**Q：如何防止 CSRF？最有效的方式是什么？**
现代最有效：`SameSite=Strict/Lax` Cookie，浏览器跨站时不携带 Cookie。传统方式：CSRF Token（服务端生成随机 Token 嵌入表单，验证请求合法性）。使用 Bearer Token（放 Authorization header 而非 Cookie）也能天然防 CSRF。

**Q：Prisma 怎么防止 SQL 注入？**
Prisma Client 的所有查询都使用参数化查询，用户输入不会被解释为 SQL 代码。`$queryRaw` 使用模板字面量也是参数化的，但字符串拼接（`$queryRaw(\`...${userInput}\`)`）危险，要用 `Prisma.sql` 标签。

## 常见易错点

- Helmet 放在 `app.use(helmet())` 里，不是 NestJS 装饰器
- CORS `credentials: true` 时，`origin` 不能设为 `*`（必须指定具体域名）
- 限流只能防暴力破解，不能防 DDoS（需要 CDN/WAF 层面处理）
- `httpOnly` Cookie 防 XSS 读取，但不防 CSRF（要配合 SameSite）
