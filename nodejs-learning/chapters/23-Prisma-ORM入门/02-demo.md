# Day 23 — Prisma ORM 入门：实操 Demo

## Demo 1：初始化 Prisma

```bash
# 在 NestJS 项目里安装
pnpm add @prisma/client
pnpm add -D prisma

# 初始化
npx prisma init
# 生成：prisma/schema.prisma 和 .env（DATABASE_URL）
```

**.env**：
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/blog_dev"
```

**prisma/schema.prisma**（完整版）：
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum Status {
  DRAFT
  PUBLISHED
}

model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  name         String
  passwordHash String    @map("password_hash")
  role         Role      @default(USER)
  posts        Post[]
  comments     Comment[]
  createdAt    DateTime  @default(now()) @map("created_at")

  @@map("users")
}

model Post {
  id        Int       @id @default(autoincrement())
  title     String    @db.VarChar(100)
  content   String
  slug      String    @unique
  status    Status    @default(DRAFT)
  views     Int       @default(0)
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  Int       @map("author_id")
  tags      Tag[]     @relation("PostToTag")
  comments  Comment[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@index([authorId])
  @@index([status, createdAt(sort: Desc)])
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  slug  String @unique
  posts Post[] @relation("PostToTag")

  @@map("tags")
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    Int      @map("post_id")
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int      @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("comments")
}
```

```bash
# 创建并应用第一次迁移
npx prisma migrate dev --name init

# 查看生成的迁移文件
cat prisma/migrations/*/migration.sql

# 打开 Prisma Studio 可视化查看数据
npx prisma studio
```

---

## Demo 2：Prisma CRUD

```ts
// scripts/seed.ts（种子数据）
import { PrismaClient, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 创建用户
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash: await bcrypt.hash('password123', 10),
    },
  });

  // 创建标签
  const tagNestjs = await prisma.tag.upsert({
    where: { slug: 'nestjs' },
    update: {},
    create: { name: 'NestJS', slug: 'nestjs' },
  });

  // 创建文章（带关联标签）
  await prisma.post.create({
    data: {
      title: 'NestJS IoC 实践',
      content: '今天学习了 IoC 控制反转，非常有收获...',
      slug: 'nestjs-ioc-practice',
      status: Status.PUBLISHED,
      authorId: alice.id,
      tags: { connect: [{ id: tagNestjs.id }] },  // 多对多关联
    },
  });

  console.log('Seed 完成');
}

main().finally(() => prisma.$disconnect());
```

```bash
npx ts-node prisma/seed.ts
```

---

## Demo 3：NestJS + Prisma Service

**src/prisma/prisma.service.ts**：
```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

**src/posts/posts.service.ts（Prisma 版）**：
```ts
@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryPostDto) {
    const { page = 1, limit = 20, status, search } = query;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { content: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        include: { author: { select: { id: true, name: true } }, tags: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    return this.prisma.post.findUniqueOrThrow({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        tags: true,
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    // findUniqueOrThrow 找不到自动抛 PrismaClientKnownRequestError (P2025)
  }
}
```
