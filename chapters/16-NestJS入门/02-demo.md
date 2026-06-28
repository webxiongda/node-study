# Day 16 — NestJS 入门：实操 Demo

## Demo 1：创建第一个 NestJS 项目

**目标**：用 CLI 创建并跑通项目，理解目录结构

```bash
# 安装 CLI（全局）
npm i -g @nestjs/cli

# 创建博客 API 项目
nest new blog-api
cd blog-api
pnpm start:dev
```

**目录结构解读**：
```
src/
├── app.controller.ts    # 根控制器（可删）
├── app.module.ts        # 根模块，注册所有子模块
├── app.service.ts       # 根服务（可删）
└── main.ts              # 入口，创建 NestFactory
```

**关注点**：`main.ts` 的 `NestFactory.create(AppModule)` — 整张依赖图从根模块开始解析。

---

## Demo 2：Posts CRUD 模块（内存版）

**目标**：实现完整 Module/Controller/Service 分层，跑通 5 个接口

```bash
# 一键生成脚手架（CRUD boilerplate）
nest g resource posts
```

**src/posts/posts.service.ts**：
```ts
import { Injectable, NotFoundException } from '@nestjs/common';

export interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
}

let nextId = 1;

@Injectable()
export class PostsService {
  private posts: Post[] = [];

  findAll() {
    return this.posts;
  }

  findOne(id: number) {
    const post = this.posts.find(p => p.id === id);
    if (!post) throw new NotFoundException(`Post #${id} 不存在`);
    return post;
  }

  create(dto: { title: string; content: string; author: string }) {
    const post: Post = { id: nextId++, ...dto };
    this.posts.push(post);
    return post;
  }

  update(id: number, dto: Partial<{ title: string; content: string }>) {
    const post = this.findOne(id);
    Object.assign(post, dto);
    return post;
  }

  remove(id: number) {
    const idx = this.posts.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Post #${id} 不存在`);
    this.posts.splice(idx, 1);
  }
}
```

**src/posts/posts.controller.ts**：
```ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  findAll() {
    return this.posts.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posts.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: any) {
    return this.posts.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.posts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    this.posts.remove(id);
  }
}
```

**运行测试**：
```bash
# 创建文章
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","content":"World","author":"Tom"}'

# 获取文章
curl http://localhost:3000/posts/1

# 触发 404
curl http://localhost:3000/posts/999
# → {"statusCode":404,"message":"Post #999 不存在","error":"Not Found"}

# 传非数字 id（触发 ParseIntPipe 400）
curl http://localhost:3000/posts/abc
# → {"statusCode":400,"message":"...","error":"Bad Request"}
```

**关注点**：
- `NotFoundException` 自动转 404 JSON，无需手动 `res.status(404)`
- `ParseIntPipe` 在参数层拦截非法类型，Controller 方法内 `id` 一定是 number

---

## Demo 3：全局 ValidationPipe + DTO

**目标**：理解 DTO 校验流程，触发 422

**src/main.ts**：
```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  await app.listen(3000);
}
bootstrap();
```

**src/posts/dto/create-post.dto.ts**（需先 `pnpm add class-validator class-transformer`）：
```ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  author: string;
}
```

**测试少传字段**：
```bash
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"","content":"x"}'
# → 422 / 400，message 数组里有每个字段的校验错误信息
```

**关注点**：
- `whitelist: true` 会静默剥离 DTO 未声明的字段（安全防护）
- `forbidNonWhitelisted: true` 改成直接报错（更严格）
- `transform: true` 让 query string 的数字字符串自动转 number
