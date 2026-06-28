# Day 18 — NestJS DTO 与数据验证：理论笔记

## 核心概念

### DTO（Data Transfer Object）

DTO 是描述「某个 HTTP 请求/响应的数据形状」的类，不是数据库模型，专注于传输层的数据约束。

```ts
// 不是 Entity，不包含业务逻辑
export class CreatePostDto {
  title: string;
  content: string;
  author: string;
}
```

### class-validator 核心装饰器 ★

```ts
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsEmail,
  MinLength, MaxLength, Min, Max, IsEnum, IsArray,
  ValidateNested, IsBoolean, IsDateString,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEmail()
  authorEmail: string;

  @IsOptional()          // 可选字段（不传不报错）
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;

  @IsEnum(['draft', 'published'])
  status: string;

  @IsArray()
  @IsString({ each: true })  // each: true 表示验证数组每个元素
  tags: string[];
}
```

### class-transformer 核心装饰器 ★

```ts
import { Type, Transform, Exclude, Expose } from 'class-transformer';

export class GetPostsQueryDto {
  @IsOptional()
  @Type(() => Number)    // 字符串 "2" → 数字 2（配合 transform: true）
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// 响应 DTO：排除敏感字段
export class UserResponseDto {
  id: number;
  email: string;

  @Exclude()             // 序列化时排除
  password: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
```

### Mapped Types（DTO 复用） ★

```ts
import { PartialType, PickType, OmitType, IntersectionType } from '@nestjs/mapped-types';

// 所有字段变可选（用于 PATCH）
export class UpdatePostDto extends PartialType(CreatePostDto) {}

// 只取部分字段
export class LoginDto extends PickType(CreateUserDto, ['email', 'password'] as const) {}

// 排除某些字段
export class PublicUserDto extends OmitType(CreateUserDto, ['password'] as const) {}

// 合并两个 DTO
export class CreatePostWithTagsDto extends IntersectionType(CreatePostDto, CreateTagsDto) {}
```

### ValidationPipe 配置详解

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // 静默剥离 DTO 未声明字段（安全）
  forbidNonWhitelisted: true,   // 多余字段直接报 400（更严格）
  transform: true,              // 开启 class-transformer（数字字符串→数字）
  transformOptions: {
    enableImplicitConversion: true,  // 根据 TS 类型自动转换，不需要 @Type
  },
  errorHttpStatusCode: 422,     // 默认 400，改成 422 更语义化
}));
```

**`enableImplicitConversion: true` vs `@Type(() => Number)`**：
- `enableImplicitConversion` 根据属性的 TS 类型自动转，更方便但"隐式"
- `@Type(() => Number)` 显式声明，更清晰，推荐用于复杂嵌套对象

### 嵌套 DTO 验证

```ts
import { ValidateNested, Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  city: string;

  @IsString()
  street: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @ValidateNested()      // 启用嵌套验证
  @Type(() => AddressDto) // 告诉 class-transformer 要实例化成什么类
  address: AddressDto;
}
```

`@ValidateNested()` + `@Type()` 缺一不可：没有 `@Type` 则 `address` 是普通对象，class-validator 无法验证它的字段。

### 自定义验证装饰器

```ts
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
class IsSlugConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return /^[a-z0-9-]+$/.test(value);
  }
  defaultMessage() {
    return 'slug 只能包含小写字母、数字和连字符';
  }
}

function IsSlug(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsSlugConstraint,
    });
  };
}

// 使用
export class CreatePostDto {
  @IsSlug()
  slug: string;
}
```

## 面试高频问题

**Q：DTO 和 Entity 的区别？**
Entity 是数据库记录的映射，包含 ORM 注解和关联关系；DTO 是传输层数据的形状描述，包含校验逻辑，两者职责不同，不应混用。

**Q：`whitelist: true` 和 `forbidNonWhitelisted: true` 有什么区别？**
`whitelist: true` 会静默剥离 DTO 未声明的字段（安全防护，防止意外修改不该改的字段）；`forbidNonWhitelisted: true` 在此基础上当存在多余字段时直接报 400，让客户端知道它传了非法字段。

**Q：`@IsOptional()` 和字段加 `?` 的区别？**
`?` 是 TypeScript 语法，只影响编译时类型检查；`@IsOptional()` 是 class-validator 的运行时装饰器，告诉校验器「这个字段不存在时跳过其他装饰器的校验」。两者通常一起用。

**Q：`PartialType` 需要从哪里导入？**
从 `@nestjs/mapped-types`，不是 `class-transformer`。如果用 Swagger 需要从 `@nestjs/swagger` 导入（带 `@ApiProperty` 继承）。

## 常见易错点

- `ValidateNested` 没加 `@Type()` → 嵌套对象字段不被验证
- `transform: true` 没开 → `@Type(() => Number)` 不生效
- 响应 DTO 的 `@Exclude()` 需要配合 `ClassSerializerInterceptor` 才生效
- `PartialType` 导入错误 → `@ApiProperty` 注解丢失（Swagger 项目）
