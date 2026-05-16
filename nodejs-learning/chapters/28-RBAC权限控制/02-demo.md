# Day 28 — RBAC 权限控制：实操 Demo

## 完整 RBAC 实现

### 装饰器文件

```ts
// src/common/decorators/auth.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// 组合装饰器：登录 + 角色
export const Auth = (...roles: string[]) =>
  applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
  );
```

### 完整 PostsController 权限矩阵

```ts
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  // 公开接口（无需登录）
  @Public()
  @Get()
  findAll(@Query() query: QueryPostDto) {
    return this.posts.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.posts.findOne(id);
  }

  // 需要登录（任意角色）
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePostDto, @Req() req: Request) {
    return this.posts.create(dto, req.user);
  }

  // 需要登录（Owner 或 Admin，在 Service 层检查）
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @Req() req: Request,
  ) {
    return this.posts.update(id, dto, req.user);
  }

  // 仅 Admin
  @Auth('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.posts.remove(id);
  }
}
```

### 测试脚本

```bash
# 获取 Token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123456"}' | jq -r .accessToken)

USER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"user123"}' | jq -r .accessToken)

# 公开接口（无 Token 可访问）
curl http://localhost:3000/posts

# 普通用户创建文章 → 201
curl -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"用户创建","content":"内容内容内容内容内容"}'

# 普通用户删除文章 → 403
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer $USER_TOKEN"
# {"statusCode":403,"message":"Forbidden resource"}

# Admin 删除文章 → 204
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" -v

# 用户修改别人的文章 → 403（Service 层 Owner Check）
curl -X PATCH http://localhost:3000/posts/99 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"试图修改别人的文章"}'
```
