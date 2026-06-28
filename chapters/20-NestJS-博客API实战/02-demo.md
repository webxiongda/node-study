# Day 20 — NestJS 博客 API 实战：实操 Demo

## Demo 1：ConfigModule 环境变量管理

**安装**：
```bash
pnpm add @nestjs/config joi
```

**.env**：
```
PORT=3000
JWT_SECRET=my-super-secret-key-2026
MAX_PAGE_SIZE=100
```

**src/app.module.ts**：
```ts
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        JWT_SECRET: Joi.string().required(),
        MAX_PAGE_SIZE: Joi.number().default(100),
      }),
    }),
    PostsModule,
  ],
})
export class AppModule {}
```

**src/main.ts**：
```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
```

---

## Demo 2：Swagger 文档集成

**安装**：
```bash
pnpm add @nestjs/swagger swagger-ui-express
```

**src/main.ts 添加**：
```ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 只在非生产环境开启
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Blog API')
      .setDescription('NestJS 博客系统 REST API 文档')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }
  
  await app.listen(3000);
}
```

**DTO 添加 Swagger 注解**：
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: '文章标题', example: 'NestJS 学习笔记', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ description: '文章正文', example: '今天学习了 IoC...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '文章状态', enum: PostStatus, default: 'draft' })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
```

访问：`http://localhost:3000/api-docs`

---

## Demo 3：完整带分页的 Posts 模块

**src/posts/posts.service.ts（完整版）**：
```ts
@Injectable()
export class PostsService {
  private posts: Post[] = [];
  private idCounter = 1;

  findAll(query: QueryPostDto): PaginatedResponseDto<Post> {
    const { page = 1, limit = 20, author, status, search } = query;
    
    let filtered = this.posts;
    if (author) filtered = filtered.filter(p => p.author === author);
    if (status) filtered = filtered.filter(p => p.status === status);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      );
    }
    
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const data = filtered.slice((page - 1) * limit, page * limit);
    
    return { data, meta: { total, page, limit, totalPages } };
  }

  findOne(id: number): Post {
    const post = this.posts.find(p => p.id === id);
    if (!post) throw new NotFoundException(`Post #${id} 不存在`);
    return post;
  }

  create(dto: CreatePostDto): Post {
    const post: Post = {
      id: this.idCounter++,
      ...dto,
      status: dto.status ?? PostStatus.DRAFT,
      tags: dto.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posts.push(post);
    return post;
  }

  update(id: number, dto: UpdatePostDto): Post {
    const post = this.findOne(id);
    Object.assign(post, dto, { updatedAt: new Date() });
    return post;
  }

  remove(id: number): void {
    const idx = this.posts.findIndex(p => p.id === id);
    if (idx === -1) throw new NotFoundException(`Post #${id} 不存在`);
    this.posts.splice(idx, 1);
  }
}
```

**测试完整 API**：
```bash
# 批量创建测试数据
for i in {1..5}; do
  curl -s -X POST http://localhost:3000/posts \
    -H 'Content-Type: application/json' \
    -d "{\"title\":\"文章$i\",\"content\":\"这是第${i}篇文章的内容，足够长\",\"author\":\"作者${i}\",\"status\":\"published\"}" | jq .
done

# 分页查询
curl "http://localhost:3000/posts?page=1&limit=3" | jq .
# 期望：{"data":[...3篇...],"meta":{"total":5,"page":1,"limit":3,"totalPages":2}}

# 搜索
curl "http://localhost:3000/posts?search=文章3" | jq .

# 健康检查
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```
