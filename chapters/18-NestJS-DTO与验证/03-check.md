# Day 18 — NestJS DTO 与数据验证：验收自测

---

## 题 1（概念）

以下哪些说法正确？（多选）

A. `@IsOptional()` 和 TypeScript 的 `?` 完全等价，写一个就够
B. `PartialType` 应该从 `@nestjs/mapped-types` 导入
C. `whitelist: true` 会让多余字段直接报 400 错误
D. `@ValidateNested()` 必须配合 `@Type()` 才能验证嵌套对象的字段
E. `@Exclude()` 不需要任何 Interceptor 就能自动在响应中隐藏字段

---

## 题 2（代码题）

以下 DTO 有什么问题？

```ts
export class GetPostsDto {
  @IsInt()
  @Min(1)
  page: number;
}
```

当请求 `GET /posts?page=2` 时，`page` 的值是什么？校验会通过吗？如何修复？

---

## 题 3（代码题）

实现一个 `CreateUserDto`，要求：
- `email`：必填，格式校验
- `password`：必填，最少 8 位
- `name`：必填，2-50 字符
- `role`：可选，只能是 `'user'` 或 `'admin'`，默认 `'user'`
- `age`：可选，整数，18-120

---

## 题 4（实操题）

实现 `UpdateUserDto`：只允许更新 `name` 和 `age`（不能更新 `email` 和 `password`）。用 `PickType` 或 `OmitType` 结合 `PartialType`。

---

## 题 5（业务场景）

你有一个用户表，密码 hash 后存储在 `User` Entity 里。当 API 返回用户信息时，需要自动排除 `password` 和 `refreshToken` 字段。描述完整的实现方案（至少两种）。

---

## 参考答案

### 题 1：B、D

- A 错：`@IsOptional()` 是运行时校验装饰器，`?` 是 TypeScript 编译时语法，两者独立，通常需要同时写
- B 正确
- C 错：`whitelist: true` 是静默剥离；`forbidNonWhitelisted: true` 才会报 400
- D 正确：没有 `@Type(() => NestedClass)` 时，嵌套对象是普通 object，class-validator 无法识别字段类型
- E 错：`@Exclude()` 需要配合 `ClassSerializerInterceptor` 才生效，且必须 `new ResponseDto(entity)` 实例化

### 题 2

问题：`query string` 里的 `?page=2`，`page` 的值是字符串 `"2"`，`@IsInt()` 会失败（字符串不是整数）。

修复方案（选一）：
```ts
// 方案1：@Type 显式转换
@Type(() => Number)
@IsInt()
@Min(1)
page: number;

// 方案2：ValidationPipe 开 enableImplicitConversion
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));
```

### 题 3

```ts
import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';

export enum UserRole { USER = 'user', ADMIN = 'admin' }

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.USER;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(120)
  age?: number;
}
```

### 题 4

```ts
import { PartialType, PickType } from '@nestjs/mapped-types';

// 方案1：Pick 出要更新的字段，再 Partial 化
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['name', 'age'] as const)
) {}

// 方案2：OmitType 排除不更新的字段，再 Partial 化
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const)
) {}
```

### 题 5

**方案1：ClassSerializerInterceptor + @Exclude()**
```ts
// 在 UserResponseDto 或 User entity 上加 @Exclude()
@Exclude()
password: string;

// Controller 或全局注册 ClassSerializerInterceptor
// 返回 new UserResponseDto(user)
```

**方案2：手动 omit**
```ts
const { password, refreshToken, ...safeUser } = user;
return safeUser;
```

**方案3：Prisma select（推荐）**
查询时就不取这些字段：
```ts
return this.prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true },
});
```
