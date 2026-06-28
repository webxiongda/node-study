# Day 18 — NestJS DTO 与数据验证：实操 Demo

## Demo 1：完整 DTO 校验

```bash
pnpm add class-validator class-transformer
```

**src/posts/dto/create-post.dto.ts**：
```ts
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MinLength(2, { message: '标题至少 2 个字符' })
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(PostStatus, { message: '状态只能是 draft 或 published' })
  @IsOptional()
  status?: PostStatus = PostStatus.DRAFT;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];
}
```

**src/posts/dto/query-post.dto.ts**：
```ts
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPostDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  author?: string;
}
```

**测试**：
```bash
# 正常创建
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"NestJS实践","content":"很好用","tags":["backend","nodejs"]}'

# 标题太短
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"x","content":"ok"}'
# → 400 {"message":["标题至少 2 个字符"],...}

# 非法 status
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"test","content":"ok","status":"invalid"}'
# → 400，message 里有枚举错误

# 分页（query string）
curl "http://localhost:3000/posts?page=2&limit=10&author=Tom"
```

---

## Demo 2：响应 DTO（排除敏感字段）

**src/users/dto/user-response.dto.ts**：
```ts
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Exclude()
  password: string;  // 不会出现在响应里

  @Exclude()
  refreshToken: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
```

**Controller 使用**：
```ts
import { ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';

@UseInterceptors(ClassSerializerInterceptor)  // 启用序列化
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findOne(id);
    return new UserResponseDto(user);  // 必须 new 出来才能触发 @Exclude
  }
}
```

或全局注册：
```ts
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

---

## Demo 3：嵌套 DTO + PartialType

**src/posts/dto/update-post.dto.ts**：
```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

// 自动把 CreatePostDto 所有字段变成可选
export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

**嵌套验证**：
```ts
import { ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MetaDto {
  @IsString()
  seoTitle: string;

  @IsString()
  seoDescription: string;
}

export class CreatePostWithMetaDto {
  @IsString()
  title: string;

  @ValidateNested()     // 启用嵌套验证
  @Type(() => MetaDto)  // 必须加，告诉 transformer 实例化成 MetaDto
  meta: MetaDto;
}
```

**测试 PATCH（PartialType 效果）**：
```bash
# 只更新标题（content 等字段不传，不报错）
curl -X PATCH http://localhost:3000/posts/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"新标题"}'
# → 200 更新成功

# 传了非法字段（whitelist: true 会剥离）
curl -X PATCH http://localhost:3000/posts/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"新标题","hackField":"evil"}'
# → 200（hackField 被静默剥离，或 403 如果开了 forbidNonWhitelisted）
```
