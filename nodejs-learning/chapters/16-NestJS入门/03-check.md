# Day 16 — NestJS 入门：验收自测

> 独立作答，不看文档。

---

## 题 1（概念）

以下说法哪个正确？

A. IoC 是依赖注入的别名，两者含义完全相同
B. DI 是 IoC 的一种具体实现方式，NestJS 采用构造函数注入
C. NestJS 的装饰器在每次请求时执行
D. `@Injectable()` 会让类在每次使用时新建一个实例

---

## 题 2（概念）

Module 的四个字段含义：

1. `providers` ______
2. `imports` ______
3. `exports` ______
4. `controllers` ______

---

## 题 3（代码题）

以下代码有什么问题？

```ts
// user.module.ts
@Module({
  providers: [UserService],
})
export class UserModule {}

// posts.module.ts
@Module({
  imports: [UserModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}

// posts.service.ts
@Injectable()
export class PostsService {
  constructor(private users: UserService) {}  // 能注入成功吗？
}
```

---

## 题 4（实操题）

`ParseIntPipe` 的作用是什么？以下写法哪个正确？

```ts
// 写法 A
@Get(':id')
findOne(@Param('id') id: string) {
  const numId = parseInt(id);
}

// 写法 B
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
```

---

## 题 5（业务场景）

你正在开发一个博客系统，有 `UserService`（用户查询）和 `PostsService`（文章操作）。`PostsService` 需要调用 `UserService` 来校验文章作者是否存在。

请描述：
1. 如何组织这两个 Module 的 imports/exports
2. 如果两个 Service 相互依赖（循环依赖），NestJS 会怎样？如何解决？

---

## 参考答案

### 题 1：B

- A 错：IoC 是思想，DI 是实现
- C 错：装饰器在类定义时（编译/加载时）执行一次，不是每次请求
- D 错：默认是单例作用域

### 题 2

1. `providers`：注册到本模块 IoC 容器的可注入类，默认单例，不自动对外暴露
2. `imports`：声明本模块要用哪些其他模块导出的东西
3. `exports`：将 providers 中的某些类暴露给导入本模块的其他模块
4. `controllers`：处理 HTTP 请求的特殊 provider，不能被 export

### 题 3

问题：`UserModule` 注册了 `UserService` 但没有 `exports: [UserService]`，所以 `PostsModule` 虽然 imports 了 `UserModule`，但拿不到 `UserService`，注入时报 `Nest can't resolve dependencies of PostsService`。

修复：
```ts
@Module({
  providers: [UserService],
  exports: [UserService],  // 加这一行
})
export class UserModule {}
```

### 题 4

`ParseIntPipe` 在参数层把字符串转成整数，转换失败时自动抛 `BadRequestException`（400）。

写法 B 正确：Controller 方法内 `id` 类型安全地是 `number`，无需手动 `parseInt`，且错误统一处理。写法 A 的问题是 `parseInt('abc')` 得到 `NaN`，不会自动报错给客户端。

### 题 5

1. 正确组织：
```ts
// user.module.ts
@Module({
  providers: [UserService],
  exports: [UserService],  // 必须 export
})
export class UserModule {}

// posts.module.ts
@Module({
  imports: [UserModule],  // import UserModule 才能用 UserService
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
```

2. 循环依赖：NestJS 报 `Circular dependency detected`。解决方案：
   - 用 `forwardRef(() => UserService)` 延迟引用
   - 更好的方案是重新设计，把公共逻辑抽到第三个 `SharedModule`，打破循环
