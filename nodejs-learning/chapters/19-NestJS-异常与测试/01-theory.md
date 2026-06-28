# Day 19 — NestJS 异常处理与测试：理论笔记

## 异常处理

### HttpException 体系

NestJS 内置异常都继承自 `HttpException`：

```ts
// 直接用内置异常
throw new NotFoundException('Post not found');
throw new BadRequestException('无效的参数');
throw new UnauthorizedException('请先登录');
throw new ForbiddenException('权限不足');
throw new ConflictException('邮箱已存在');
throw new UnprocessableEntityException('数据格式错误');
throw new InternalServerErrorException('服务器错误');

// 带详情
throw new BadRequestException({
  message: '校验失败',
  errors: [{ field: 'email', message: '格式不正确' }],
});
```

### 自定义业务异常 ★

```ts
import { HttpException, HttpStatus } from '@nestjs/common';

// 自定义异常基类
export class AppException extends HttpException {
  constructor(message: string, statusCode: number, public readonly code: string) {
    super({ message, code }, statusCode);
  }
}

// 业务层异常
export class PostNotFoundException extends AppException {
  constructor(id: number) {
    super(`文章 #${id} 不存在`, HttpStatus.NOT_FOUND, 'POST_NOT_FOUND');
  }
}

export class DuplicateSlugException extends AppException {
  constructor(slug: string) {
    super(`Slug "${slug}" 已被使用`, HttpStatus.CONFLICT, 'DUPLICATE_SLUG');
  }
}
```

**设计原则**：Service 抛业务异常，Filter 统一格式化，不要在 Service 里构造 HTTP 响应格式。

### 全局 ExceptionFilter

```ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = '服务器内部错误';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any).message;
      code = (exception as any).code ?? exception.constructor.name;
    }

    // 生产环境不暴露 500 错误细节
    if (status === 500 && process.env.NODE_ENV === 'production') {
      message = '服务器内部错误';
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

## NestJS 单元测试

### 测试模块基础

```ts
import { Test, TestingModule } from '@nestjs/testing';

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('findAll 返回空数组', () => {
    expect(service.findAll()).toEqual([]);
  });

  it('findOne 不存在时抛 NotFoundException', () => {
    expect(() => service.findOne(999)).toThrow(NotFoundException);
  });
});
```

### Mock 依赖 ★

```ts
describe('PostsController', () => {
  let controller: PostsController;
  let postsService: PostsService;

  const mockPostsService = {
    findAll: jest.fn().mockReturnValue([{ id: 1, title: 'Test' }]),
    findOne: jest.fn().mockImplementation((id: number) => {
      if (id === 1) return { id: 1, title: 'Test' };
      throw new NotFoundException();
    }),
    create: jest.fn().mockImplementation(dto => ({ id: 2, ...dto })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        { provide: PostsService, useValue: mockPostsService },  // 注入 mock
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get<PostsService>(PostsService);
  });

  it('findAll 调用 service.findAll', async () => {
    const result = await controller.findAll();
    expect(postsService.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
```

### 测试异步代码

```ts
it('create 返回新创建的文章', async () => {
  const dto = { title: 'New Post', content: 'Content', author: 'Tom' };
  const result = await controller.create(dto);
  expect(result).toMatchObject({ title: 'New Post' });
  expect(postsService.create).toHaveBeenCalledWith(dto);
});

it('findOne 找不到时抛异常', async () => {
  await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
});
```

### 测试中常用 Jest 断言

```ts
expect(value).toBe(exact);           // 严格相等
expect(value).toEqual(object);       // 深度相等
expect(value).toMatchObject(partial);// 包含这些字段（其他字段不管）
expect(fn).toHaveBeenCalled();       // 函数被调用过
expect(fn).toHaveBeenCalledWith(args);
expect(fn).toHaveBeenCalledTimes(n);
expect(promise).rejects.toThrow(Error);
expect(() => fn()).toThrow(Error);
```

### 测试文件组织

```
src/
├── posts/
│   ├── posts.controller.ts
│   ├── posts.controller.spec.ts  ← 单元测试
│   ├── posts.service.ts
│   └── posts.service.spec.ts    ← 单元测试
└── app.e2e-spec.ts               ← 端到端测试（test/ 目录）
```

```bash
pnpm test              # 运行所有单元测试（Jest）
pnpm test:watch        # watch 模式
pnpm test:cov          # 覆盖率报告
pnpm test:e2e          # 端到端测试
```

## 面试高频问题

**Q：NestJS 里如何统一处理所有异常？**
实现 `ExceptionFilter`，加 `@Catch()` 装饰器（不传参捕获所有异常），在 `catch` 方法里根据异常类型格式化响应。用 `app.useGlobalFilters()` 或 `APP_FILTER` provider 全局注册。

**Q：Controller 单元测试怎么避免真实的 Service 调用？**
用 `jest.fn()` 创建 mock 对象，在 `TestingModule` 的 `providers` 里用 `{ provide: PostsService, useValue: mockPostsService }` 替换。这样测试 Controller 时完全不需要真实 Service 实例。

**Q：单元测试和集成测试的区别？**
单元测试：mock 所有外部依赖，只测当前单元的逻辑（快，隔离）；集成测试：启动完整 NestJS 应用，用真实 HTTP 请求测试，包含中间件/Guard/Pipe（慢，真实）。

## 常见易错点

- Service 层抛裸 `Error` → 变 500，暴露内部信息
- 在 `main.ts` 用 `new Filter()` 注册 → 注入失败
- Filter 里没有兜底 `@Catch()` → 未匹配的异常不被格式化
- Jest mock 函数没有在 `beforeEach` 里 `jest.clearAllMocks()` → 上一个测试的调用记录污染下一个
