# Day 20 — NestJS 博客 API 实战：理论笔记

## 核心概念

### ConfigModule（环境变量管理）

```ts
// app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,      // 全局可用，无需每个模块 import
      envFilePath: '.env',
      validationSchema: Joi.object({  // 校验必填环境变量
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),
  ],
})
export class AppModule {}
```

使用：
```ts
@Injectable()
export class PostsService {
  constructor(private config: ConfigService) {}
  
  getMaxPageSize() {
    return this.config.get<number>('MAX_PAGE_SIZE', 100);
  }
}
```

### Swagger 文档自动生成

```bash
pnpm add @nestjs/swagger swagger-ui-express
```

```ts
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Blog API')
  .setDescription('博客系统 REST API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
// 访问 http://localhost:3000/api-docs
```

DTO 标注：
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';  // 注意：用 @nestjs/swagger 的 PartialType 才能保留 @ApiProperty

export class CreatePostDto {
  @ApiProperty({ description: '文章标题', example: 'NestJS 入门' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ description: '文章状态', enum: PostStatus, default: PostStatus.DRAFT })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
```

Controller 标注：
```ts
@ApiTags('posts')
@Controller('posts')
export class PostsController {
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({ status: 201, description: '创建成功', type: Post })
  @Post()
  create(@Body() dto: CreatePostDto) {}
}
```

### 项目结构规范

```
src/
├── common/                        # 公共基础设施
│   ├── decorators/               # 自定义装饰器
│   ├── filters/                  # Exception Filters
│   ├── guards/                   # Guards
│   ├── interceptors/             # Interceptors
│   ├── pipes/                    # 自定义 Pipes
│   └── dto/                      # 共用 DTO（如分页）
├── config/                        # 配置模块
├── posts/                         # 功能模块（垂直切分）
│   ├── dto/
│   │   ├── create-post.dto.ts
│   │   ├── update-post.dto.ts
│   │   └── query-post.dto.ts
│   ├── posts.controller.ts
│   ├── posts.controller.spec.ts
│   ├── posts.module.ts
│   ├── posts.service.ts
│   └── posts.service.spec.ts
├── users/
└── app.module.ts
```

**原则**：按功能模块垂直切分（`posts/`、`users/`），不要按层水平切分（`controllers/`、`services/`）。

### 分页响应格式

```ts
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

```ts
// Service 里
async findAll(query: QueryPostDto) {
  const { page = 1, limit = 20, author, status } = query;
  let data = this.posts;
  if (author) data = data.filter(p => p.author === author);
  if (status) data = data.filter(p => p.status === status);
  
  const total = data.length;
  const paginated = data.slice((page - 1) * limit, page * limit);
  
  return {
    data: paginated,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
```

### 健康检查接口

```ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

## 面试高频问题

**Q：NestJS 项目结构应该按什么原则组织？**
按功能模块垂直切分（Feature-based），每个功能目录包含自己的 Controller/Service/DTO/Test。避免按层水平切分（`controllers/`、`services/` 目录），因为随着功能增多会变得难以导航。

**Q：ConfigModule 和直接读 `process.env` 有什么区别？**
ConfigModule 可以在启动时用 Joi 等工具校验必填的环境变量，早发现配置错误；支持类型安全的 `config.get<number>('PORT')`；支持不同环境的 `.env` 文件；还可以用 `ConfigService` 注入，方便测试时替换配置。

**Q：Swagger 在生产环境应该关闭吗？**
一般生产环境关闭（防止暴露 API 细节），或需要认证才能访问。可以用 `if (process.env.NODE_ENV !== 'production')` 条件注册 SwaggerModule。

## 常见易错点

- Swagger 的 `PartialType` 要从 `@nestjs/swagger` 导入，不然继承的 `@ApiProperty` 会丢失
- ConfigModule `isGlobal: true` 后，其他模块不需要再 import ConfigModule
- 分页时忘了处理空数组的边界情况（`totalPages: 0` vs `1`）
- `.env` 文件不应该提交到 Git（加入 `.gitignore`）
