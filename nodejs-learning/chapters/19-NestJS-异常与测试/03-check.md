# Day 19 — NestJS 异常处理与测试：验收自测

---

## 题 1（概念）

以下说法哪些正确？（多选）

A. `throw new Error('msg')` 会被默认 Filter 转成 500 响应
B. 自定义 ExceptionFilter 里 `@Catch()` 不传参时，只捕获 `HttpException`
C. 在 Service 里抛 `NotFoundException` 会破坏分层架构，应该在 Controller 里抛
D. `jest.fn()` 创建的 mock 函数，可以用 `toHaveBeenCalledWith` 断言调用参数
E. `TestingModule` 中注入 mock 时，`useValue` 里的对象会替换原始 provider

---

## 题 2（代码题）

以下 Filter 有什么问题？

```ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception.getStatus();
    ctx.getResponse().status(status).json({ message: exception.message });
  }
}
```

---

## 题 3（实操题）

写一个测试，验证 `PostsController.create` 方法：
1. 调用了 `postsService.create` 并传入了正确的 DTO
2. 返回了 service 返回的对象

```ts
// posts.controller.spec.ts
describe('PostsController', () => {
  // 实现
});
```

---

## 题 4（代码题）

如何测试一个异步 Service 方法（依赖数据库）？

```ts
// users.service.ts
async findByEmail(email: string): Promise<User> {
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundException('用户不存在');
  return user;
}
```

写出测试代码，mock `PrismaService`。

---

## 题 5（业务场景）

你的 API 有这样的需求：
1. 数据库主键冲突（Prisma 抛 `PrismaClientKnownRequestError`，code P2002）→ 返回 409 Conflict
2. 数据未找到（Prisma 抛 P2025）→ 返回 404 Not Found
3. 其他所有未知错误 → 返回 500，生产环境不暴露细节

描述如何用 ExceptionFilter 实现。

---

## 参考答案

### 题 1：A、D、E

- A 正确：裸 Error 不是 HttpException，默认或自定义 `@Catch()` Filter 处理后返回 500
- B 错：`@Catch()` 不传参捕获所有异常；`@Catch(HttpException)` 才只捕获 HttpException
- C 错：在 Service 里抛 NestJS HttpException 是约定的做法（信号量），小项目完全可以，大项目可以抛 DomainError 在 Filter 里映射
- D 正确
- E 正确

### 题 2

问题：
1. `@Catch(HttpException)` 只捕获 HttpException，非 HttpException（如数据库错误）不会被这个 Filter 处理，会变成默认 500 且格式不统一
2. `exception.message` 只是异常的 `message` 字段，而 NestJS HttpException 的 `getResponse()` 可能包含更丰富的信息（如 ValidationPipe 的字段错误数组）

修复：
```ts
@Catch()  // 改成捕获所有
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const response = exception instanceof HttpException ? exception.getResponse() : '服务器内部错误';
    ctx.getResponse().status(status).json({ message: response });
  }
}
```

### 题 3

```ts
describe('PostsController', () => {
  let controller: PostsController;
  let postsService: PostsService;

  const mockPostsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: mockPostsService }],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get<PostsService>(PostsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('create 调用 service.create 并返回结果', async () => {
    const dto = { title: 'Test', content: 'Content...', author: 'Tom' };
    const expected = { id: 1, ...dto };
    mockPostsService.create.mockReturnValue(expected);

    const result = await controller.create(dto as any);

    expect(postsService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });
});
```

### 题 4

```ts
describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('findByEmail 找到用户', async () => {
    const user = { id: 1, email: 'test@example.com' };
    mockPrisma.user.findUnique.mockResolvedValue(user);
    await expect(service.findByEmail('test@example.com')).resolves.toEqual(user);
  });

  it('findByEmail 用户不存在时抛 NotFoundException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findByEmail('none@example.com')).rejects.toThrow(NotFoundException);
  });
});
```

### 题 5

```ts
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return res.status(409).json({ success: false, code: 'DUPLICATE', message: '数据已存在' });
      }
      if (exception.code === 'P2025') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: '记录不存在' });
      }
    }

    if (exception instanceof HttpException) {
      return res.status(exception.getStatus()).json(exception.getResponse());
    }

    // 兜底：500
    const message = process.env.NODE_ENV === 'production' ? '服务器内部错误' : (exception as Error).message;
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message });
  }
}
```
