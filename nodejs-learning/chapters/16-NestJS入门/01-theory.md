# Day 16 — NestJS 入门：理论笔记

## 核心概念

### IoC 控制反转 ★面试常考

**问题根源**：传统写法调用者主动 `new` 依赖，导致：换实现要改所有调用点、写单测必须 hack import、共享昂贵对象要自己写单例。

**IoC 的解法**：把对象的创建/组装权交给框架容器，调用者只声明「我需要什么」。

**DI（依赖注入）**是 IoC 的具体实现方式——通过构造函数把依赖注射进来：

```ts
@Injectable()
class PostsController {
  constructor(private readonly posts: PostsService) {}
  // 不 new、不 import 工厂，直接声明需要谁
}
```

### 装饰器原理 ★面试常考

装饰器本质是一个函数，在**类定义时执行一次**，往类身上写元数据：

```ts
function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('injectable', true, target);
  };
}
// @Injectable() 等价于 Injectable()(PostsService)
```

关键开关（tsconfig.json）：
```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true   // 把参数类型写进编译产物
}
```

`emitDecoratorMetadata` 让 Nest 能读取构造函数参数的类型，自动完成依赖解析。

### Module — 装配清单

```ts
@Module({
  imports: [UsersModule],          // 用别的模块导出的 provider
  controllers: [PostsController],  // 本模块的 HTTP 端点
  providers: [PostsService],       // 可注入的服务
  exports: [PostsService],         // 暴露给外部模块
})
export class PostsModule {}
```

| 字段 | 含义 | 注意 |
|------|------|------|
| `providers` | 注册到容器，默认单例 | 不自动暴露 |
| `controllers` | 特殊 provider，扫描路由 | 不能 export |
| `imports` | 声明依赖谁 | 只能拿对方 exports 的 |
| `exports` | 暴露给外部 | 不写就是私有 |

**高频坑**：跨模块注入报 `Nest can't resolve dependencies` → 90% 是忘了 `exports`。

### Controller — 只做翻译

职责：HTTP 请求 → 方法调用 → HTTP 响应，不写业务逻辑。

```ts
@Controller('posts')
export class PostsController {
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posts.findOne(id);  // 一行调用，没有分支
  }
}
```

常用参数装饰器：`@Param` / `@Query` / `@Body` / `@Headers`。

**警告**：用了 `@Res()` 自己调 `res.send()` 后，Interceptor/Filter 对该 handler 全部失效。

### Service — 业务逻辑的家

`@Injectable()` 只做一件事：把类登记到 IoC 容器。

```ts
@Injectable()
export class PostsService {
  findOne(id: number) {
    const post = this.posts.find(p => p.id === id);
    if (!post) throw new NotFoundException(`Post #${id} 不存在`);
    return post;
  }
}
```

**要点**：抛 Nest 内置 `HttpException`（如 `NotFoundException`），而非裸 `Error`，否则变 500 且泄漏内部信息。

### Provider 作用域

```ts
@Injectable()                              // DEFAULT：全局单例（默认）
@Injectable({ scope: Scope.REQUEST })      // 每请求一个新实例
@Injectable({ scope: Scope.TRANSIENT })    // 每次注入都新建
```

**REQUEST 作用域的代价**：会传染整条依赖链，凡是依赖它的都跟着变成请求作用域 → 性能下降。能用 `AsyncLocalStorage` 解决的就别用 REQUEST。

## 请求生命周期（预览）

```
HTTP Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Filter → HTTP Response
```

## 面试高频问题

**Q：IoC 和 DI 的区别？**
A：IoC 是思想（控制权从业务代码转交框架），DI 是实现方式（通过构造函数注入依赖）。

**Q：装饰器是如何工作的？**
A：类定义时执行一次，用 `Reflect.defineMetadata` 写元数据；Nest 启动时遍历模块注册的所有类，读取元数据构造依赖图。

**Q：Module 的 imports 和 providers 的区别？**
A：`providers` 是注册到本模块容器的可注入类；`imports` 是声明本模块要用哪些其他模块导出的东西。

**Q：为什么不能用 interface 作为注入类型？**
A：TS interface 在编译后被擦除，运行时不存在类型信息，Nest 无法通过反射找到对应的 provider。必须用 class 或 `@Inject('TOKEN')` 手动指定。

**Q：Provider 默认是什么作用域？**
A：DEFAULT 单例——应用启动时构造一次，所有依赖它的地方共享同一实例。

## 常见易错点

- 在 Controller 写 if/else 业务逻辑 → 挪到 Service
- `new SomeService()` 手动构造 → 绕过容器，失去单例和测试替换
- 跨模块用 Service 但忘了 `exports` → 报依赖解析失败
- interface 作为注入类型 → 运行时不存在
- 滥用 `Scope.REQUEST` → 传染依赖链，性能问题
