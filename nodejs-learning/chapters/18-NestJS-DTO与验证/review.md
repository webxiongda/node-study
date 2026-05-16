# Day 18 — NestJS DTO 与数据验证：复习文档

## 核心知识点总结

| 工具 | 职责 | 常用装饰器 |
|------|------|-----------|
| class-validator | 运行时校验 | @IsString/@IsInt/@IsEmail/@IsEnum/@IsOptional/@IsArray |
| class-transformer | 类型转换+序列化 | @Type/@Transform/@Exclude/@Expose |
| @nestjs/mapped-types | DTO 复用 | PartialType/PickType/OmitType/IntersectionType |

## 易错点

- `@IsOptional()` ≠ TypeScript `?`（前者运行时，后者编译时）
- `whitelist` 静默剥离 vs `forbidNonWhitelisted` 报错（容易混淆）
- `@ValidateNested()` 没加 `@Type()` → 嵌套不验证
- `@Exclude()` 没有 `ClassSerializerInterceptor` → 不生效
- `transform: true` 没开 → `@Type(() => Number)` 无效
- `PartialType` 从 `@nestjs/swagger` 导入才能保留 `@ApiProperty`

## 高频面试题

**Q1：DTO 和 Entity 有什么区别？**
Entity 是数据库模型映射，包含 ORM 关系和列定义；DTO 是 HTTP 传输层的数据结构，专注于校验规则。两者分开维护，避免数据库字段直接暴露给 API。

**Q2：`whitelist: true` 的安全意义是什么？**
防止用户传入 DTO 未声明的字段被意外传递到 Service 层，例如传入 `id` 或 `isAdmin` 字段。特别是配合 TypeORM 的 `save(dto)` 时，可防止用户篡改不该改的字段。

**Q3：`PartialType` 和手动加 `?` 的区别？**
`PartialType` 不仅把字段变可选，还继承了原 DTO 上所有的 class-validator 装饰器（如 `@IsString` `@MinLength`），手动加 `?` 则需要重新写所有装饰器。

**Q4：如何实现自定义校验规则？**
实现 `ValidatorConstraintInterface`，加 `@ValidatorConstraint()` 装饰器，再用 `registerDecorator` 包装成可复用的装饰器函数。异步验证（如查数据库）也支持，在 `@ValidatorConstraint({ async: true })` 中返回 Promise。

**Q5：如何在响应中隐藏敏感字段？**
三种方案：(1) `@Exclude()` + `ClassSerializerInterceptor` + `new ResponseDto(entity)`；(2) 手动 spread 排除 `const { password, ...rest } = user`；(3) Prisma/ORM 的 `select` 查询时就不取敏感字段（推荐，性能最好）。

## 自测题（不看答案）

1. `@IsOptional()` 字段如果传了但格式不对，还会校验吗？
2. `ValidationPipe` 的 `transform` 和 `transformOptions.enableImplicitConversion` 有什么区别？
3. 如何让分页参数 `page` 和 `limit` 的 query string 自动转成数字？
4. `IntersectionType(A, B)` 和同时继承两个类有什么区别？

## 下一章建议

Day 19：NestJS 异常处理与单元测试——自定义异常层级、`HttpException` 继承链、Jest + `@nestjs/testing` 的 `TestingModule` 用法、如何 mock Service 测试 Controller。
