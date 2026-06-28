# Day 23 — Prisma ORM 入门：理论笔记

## 核心概念

### Prisma 是什么？

Prisma 是 Node.js/TypeScript 的下一代 ORM，三大组件：
- **Prisma Schema**：数据库结构的单一事实来源（`.prisma` 文件）
- **Prisma Client**：自动生成的类型安全查询客户端
- **Prisma Migrate**：声明式数据库迁移

与传统 ORM（TypeORM/Sequelize）的核心区别：**schema 驱动**，生成的 Client 完全类型安全，IDE 自动补全。

### Prisma Schema 语法 ★

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  posts     Post[]   // 一对多关系（User 有多篇 Post）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  slug      String   @unique
  status    Status   @default(DRAFT)
  views     Int      @default(0)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  Int
  tags      Tag[]    @relation("PostToTag")
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([status, createdAt(sort: Desc)])
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  slug  String @unique
  posts Post[] @relation("PostToTag")
}

enum Role {
  USER
  ADMIN
}

enum Status {
  DRAFT
  PUBLISHED
}
```

### 迁移命令 ★

```bash
# 创建并应用迁移（开发环境）
npx prisma migrate dev --name init

# 仅创建迁移文件（不应用）
npx prisma migrate dev --name add-views-column --create-only

# 生产环境应用迁移（不修改 schema）
npx prisma migrate deploy

# 生成/重新生成 Prisma Client
npx prisma generate

# 查看数据库（Prisma Studio）
npx prisma studio
```

### Prisma Client CRUD ★

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 创建
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    password: 'hashed',
  },
});

// 查询
const posts = await prisma.post.findMany({
  where: {
    status: 'PUBLISHED',
    author: { name: { contains: 'alice', mode: 'insensitive' } },
  },
  include: { author: { select: { id: true, name: true } } },
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 20,
});

// 单个查询
const post = await prisma.post.findUnique({ where: { id: 1 } });
const post2 = await prisma.post.findUniqueOrThrow({ where: { id: 1 } }); // 找不到抛错

// 更新
const updated = await prisma.post.update({
  where: { id: 1 },
  data: { title: '新标题', views: { increment: 1 } },  // 原子增量
});

// 删除
await prisma.post.delete({ where: { id: 1 } });

// 计数
const count = await prisma.post.count({ where: { status: 'PUBLISHED' } });

// 聚合
const stats = await prisma.post.aggregate({
  _sum: { views: true },
  _avg: { views: true },
  _max: { views: true },
  where: { authorId: 1 },
});
```

### select vs include ★

```ts
// select：只取指定字段（排除其他，包括敏感字段）
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: { id: true, name: true, email: true },
  // password 不在 select 里，不会返回
});

// include：取所有字段 + 关联数据
const post = await prisma.post.findUnique({
  where: { id: 1 },
  include: {
    author: true,         // 取全部 User 字段
    tags: true,
    comments: {
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});
```

### 在 NestJS 中使用 Prisma ★

```ts
// prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

// prisma/prisma.module.ts
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// app.module.ts 里 imports: [PrismaModule, ...]

// posts.service.ts 里注入使用
@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryPostDto) {
    const { page = 1, limit = 20 } = query;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({ skip: (page-1)*limit, take: limit }),
      this.prisma.post.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total/limit) } };
  }
}
```

## 面试高频问题

**Q：Prisma 和 TypeORM 的区别？**
Prisma 的 Client 完全类型安全（从 schema 自动生成），IDE 补全精确，错误在编译时暴露；TypeORM 的类型推导不完整，查询错误通常在运行时才发现。Prisma 使用 schema 驱动，TypeORM 使用 Entity 装饰器驱动。Prisma 的关系查询更直观，避免 N+1 更方便。

**Q：`findUnique` 和 `findFirst` 的区别？**
`findUnique` 只能用 `@unique` 或 `@id` 字段查询，保证唯一性，性能更好；`findFirst` 可以用任意条件，返回第一个匹配的，不保证唯一性。

**Q：`select` 和 `include` 不能同时在同一层使用（只能选一个）。**

## 常见易错点

- 忘了运行 `prisma generate` → Client 没有最新 schema 的类型
- `onDelete: Cascade` 写在 Prisma schema，不是数据库里手动加
- 迁移文件不能手动修改（生产风险），应该通过 schema 变更创建新迁移
- `PrismaService extends PrismaClient` + `OnModuleInit.$connect()` 是 NestJS 集成的标准模式
