# Day 26 — 接入真实数据库：理论笔记

## 博客 API 数据库接入全流程

### 环境配置

```bash
# .env.development
DATABASE_URL="postgresql://postgres:password@localhost:5432/blog_dev"

# .env.production
DATABASE_URL="postgresql://prod_user:strong_pass@prod-host/blog_prod?connection_limit=20&pool_timeout=10"
```

ConfigModule 里 Joi 强制校验：
```ts
validationSchema: Joi.object({
  DATABASE_URL: Joi.string().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
})
```

### PrismaService 生产级配置 ★

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      log: config.get('NODE_ENV') === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
      datasources: {
        db: { url: config.get<string>('DATABASE_URL') },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
```

### Seed 数据策略

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 用 upsert 保证幂等（重复运行不重复创建）
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash: await bcrypt.hash('admin123456', 10),
      role: 'ADMIN',
    },
  });
  
  // 批量 seed 文章
  await prisma.post.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      title: `示例文章 ${i + 1}`,
      content: `这是第 ${i + 1} 篇示例文章的内容，包含足够多的文字...`,
      slug: `example-post-${i + 1}`,
      status: i % 2 === 0 ? 'PUBLISHED' : 'DRAFT',
      authorId: admin.id,
    })),
    skipDuplicates: true,  // 已存在则跳过
  });
  
  console.log('Seed 完成');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

```bash
npx prisma db seed
```

### 迁移工作流 ★

```bash
# 开发环境（创建迁移 + 应用 + 生成 Client）
npx prisma migrate dev --name describe-what-changed

# CI/CD 或生产（只应用迁移，不创建）
npx prisma migrate deploy

# 验证迁移状态（查看哪些迁移已应用/待应用）
npx prisma migrate status

# 紧急情况回滚（不推荐，Prisma 无内置回滚）
# 手动执行反向 SQL，然后删除迁移记录
```

### 生产环境 Dockerfile 集成

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate  # 必须在 build 前生成 Client
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY prisma ./prisma
EXPOSE 3000

# 启动时先跑迁移，再启动应用
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

## 面试高频问题

**Q：生产环境如何处理数据库迁移？**
使用 `prisma migrate deploy` 而非 `migrate dev`。在 CI/CD 流程里，先跑迁移再部署新代码版本；或在应用启动命令里前置迁移（`migrate deploy && node main`）。迁移文件提交到 Git，视为代码的一部分。

**Q：如何保证 Seed 数据可重复运行？**
用 `upsert`（存在则更新或跳过，不存在则创建）代替 `create`；或 `createMany` 配合 `skipDuplicates: true`。

**Q：连接池在容器化环境里如何配置？**
每个容器实例有自己的连接池，总连接数 = 实例数 × 连接池大小。需要控制总数不超过数据库最大连接数。用 PgBouncer 等连接池代理进一步管理。

## 常见易错点

- `prisma generate` 必须在 `npm run build` 之前运行（Docker 里尤其容易忘）
- 生产不要用 `migrate dev`（会提示重置数据库）
- Seed 用 `upsert` 确保幂等
- `.env` 文件不要提交到 Git，用 CI 环境变量注入
