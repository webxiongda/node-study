# Day 30 — Web 安全：实操 Demo

## Demo 1：NestJS 安全配置

```ts
// main.ts
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(helmet());
  app.use(cookieParser());
  
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:4200'],
    credentials: true,
  });
  
  await app.listen(3000);
}
```

```ts
// app.module.ts（限流）
imports: [
  ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
],
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

## Demo 2：安全漏洞演示

```ts
// ❌ XSS 漏洞（直接插入 innerHTML）
document.getElementById('output').innerHTML = userInput;

// ✅ 安全（React 自动转义）
return <div>{userInput}</div>;

// ❌ SQL 注入（Prisma $queryRaw 字符串拼接）
const results = await prisma.$queryRaw(`SELECT * FROM posts WHERE title = '${userInput}'`);

// ✅ 安全（参数化）
const results = await prisma.$queryRaw`SELECT * FROM posts WHERE title = ${userInput}`;

// ✅ 或直接用 Prisma API（完全安全）
const results = await prisma.post.findMany({ where: { title: { contains: userInput } } });
```

## Demo 3：验证 Helmet Headers

```bash
curl -I http://localhost:3000/health
# 应该看到这些安全 header：
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-DNS-Prefetch-Control: off
# ...
```
