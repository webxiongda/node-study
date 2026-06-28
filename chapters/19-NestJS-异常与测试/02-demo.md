# Day 19 — NestJS 异常处理与测试：实操 Demo

## Demo 1：自定义异常层级

**src/common/exceptions/app.exception.ts**：
```ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly code: string,
  ) {
    super({ message, code }, statusCode);
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id: number | string) {
    super(`${resource} #${id} 不存在`, HttpStatus.NOT_FOUND, `${resource.toUpperCase()}_NOT_FOUND`);
  }
}

export class DuplicateResourceException extends AppException {
  constructor(field: string, value: string) {
    super(`${field} "${value}" 已存在`, HttpStatus.CONFLICT, 'DUPLICATE_RESOURCE');
  }
}

export class BusinessLogicException extends AppException {
  constructor(message: string, code: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, code);
  }
}
```

**使用**：
```ts
// posts.service.ts
findOne(id: number) {
  const post = this.posts.find(p => p.id === id);
  if (!post) throw new ResourceNotFoundException('Post', id);
  return post;
}

create(dto: CreatePostDto) {
  const dup = this.posts.find(p => p.title === dto.title);
  if (dup) throw new DuplicateResourceException('title', dto.title);
  // ...
}
```

---

## Demo 2：全局 Exception Filter

**src/common/filters/global-exception.filter.ts**：
```ts
import {
  Catch, ExceptionFilter, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = '服务器内部错误';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object') {
        message = (response as any).message ?? response;
        code = (response as any).code ?? exception.constructor.name;
      } else {
        message = response;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    res.status(status).json({
      success: false,
      code,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**注册（main.ts）**：
```ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

## Demo 3：PostsService 单元测试

**src/posts/posts.service.spec.ts**：
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { ResourceNotFoundException } from '../common/exceptions/app.exception';
import { PostStatus } from './dto/create-post.dto';

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService],
    }).compile();
    service = module.get<PostsService>(PostsService);
  });

  describe('findAll', () => {
    it('初始返回空数组', () => {
      expect(service.findAll({})).toEqual([]);
    });

    it('按 author 筛选', () => {
      service.create({ title: 'Post1', content: 'Content...', author: 'Alice', status: PostStatus.PUBLISHED, tags: [] });
      service.create({ title: 'Post2', content: 'Content...', author: 'Bob', status: PostStatus.PUBLISHED, tags: [] });
      const result = service.findAll({ author: 'Alice' });
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Alice');
    });
  });

  describe('findOne', () => {
    it('找到存在的文章', () => {
      const created = service.create({ title: 'Test', content: 'Content...', author: 'Tom', status: PostStatus.DRAFT, tags: [] });
      const found = service.findOne(created.id);
      expect(found).toMatchObject({ title: 'Test', author: 'Tom' });
    });

    it('找不到时抛 ResourceNotFoundException', () => {
      expect(() => service.findOne(9999)).toThrow(ResourceNotFoundException);
    });
  });

  describe('create', () => {
    it('创建成功返回完整对象', () => {
      const dto = { title: 'New Post', content: 'Content here...', author: 'Jane', status: PostStatus.DRAFT, tags: ['test'] };
      const result = service.create(dto);
      expect(result).toMatchObject(dto);
      expect(result.id).toBeDefined();
    });
  });

  describe('remove', () => {
    it('删除不存在的文章抛异常', () => {
      expect(() => service.remove(9999)).toThrow(ResourceNotFoundException);
    });

    it('删除已创建的文章成功', () => {
      const post = service.create({ title: 'Delete Me', content: 'content...', author: 'x', status: PostStatus.DRAFT, tags: [] });
      expect(() => service.remove(post.id)).not.toThrow();
      expect(() => service.findOne(post.id)).toThrow(ResourceNotFoundException);
    });
  });
});
```

运行：
```bash
pnpm test posts.service
# PASS src/posts/posts.service.spec.ts
#   PostsService
#     findAll
#       ✓ 初始返回空数组
#       ✓ 按 author 筛选
#     findOne
#       ✓ 找到存在的文章
#       ✓ 找不到时抛 ResourceNotFoundException
#     ...
```
