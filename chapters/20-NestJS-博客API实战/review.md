# Day 20 — NestJS 博客 API 实战：复习文档

## NestJS 阶段总结（Day 16-20）

| Day | 主题 | 核心产出 |
|-----|------|---------|
| 16 | IoC/DI/Module/Controller/Service | 第一个 NestJS 项目 |
| 17 | 请求生命周期 6 层 | Logger/Guard/Interceptor/Filter |
| 18 | DTO + 数据验证 | class-validator + Mapped Types |
| 19 | 异常处理 + 单元测试 | 自定义异常 + Jest Mock |
| 20 | 实战整合 | 完整博客 API + Swagger + ConfigModule |

## 核心知识点总结

**项目结构原则**：按功能模块垂直切分，每个模块自包含 Controller/Service/DTO/Test。

**全局配置**（main.ts）：
```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalInterceptors(new TransformInterceptor());
app.useGlobalFilters(new GlobalExceptionFilter());
```

**分页公式**：`slice((page - 1) * limit, page * limit)`，`totalPages = Math.ceil(total / limit)`

## 高频面试题

**Q1：你的 NestJS 项目是什么结构？**
按功能模块垂直切分：`posts/`、`users/` 等，每个模块包含 `module.ts`/`controller.ts`/`service.ts`/`dto/`/`*.spec.ts`。公共基础设施放 `common/`（filters/interceptors/guards/middleware）。

**Q2：如何管理 NestJS 应用的环境变量？**
使用 `@nestjs/config` 的 ConfigModule，配置 `isGlobal: true` 全局可用，用 Joi 做启动时校验（必填项缺失直接报错退出），通过 `ConfigService.get<T>('KEY', defaultValue)` 类型安全地读取。

**Q3：Swagger 文档自动生成的原理是什么？**
`@ApiProperty` 等装饰器在 DTO 上写元数据，`DocumentBuilder` + `SwaggerModule.createDocument` 遍历所有 Controller 的路由和 DTO 元数据，生成 OpenAPI JSON 规范，再由 swagger-ui-express 渲染成可交互文档页面。

## 自测题（不看答案）

1. `ConfigModule.forRoot({ isGlobal: true })` 的 `isGlobal` 去掉会怎样？
2. 分页请求 `?page=2&limit=10`，数据集有 25 条，返回哪些数据？`totalPages` 是多少？
3. Swagger 的 `PartialType` 和 `@nestjs/mapped-types` 的 `PartialType` 有什么区别？
4. 如何让某些接口在 Swagger 文档里需要 Bearer Token 授权？

## 下一阶段预告

**Day 21-30：PostgreSQL + Prisma ORM**
- SQL 基础（SELECT/JOIN/索引）
- Prisma 迁移、关联（one-to-many/many-to-many）
- 事务与 N+1 问题
- 用真实数据库替换内存数组

博客 API 将在 Day 26 接入真实 PostgreSQL 数据库，代码结构不需要大改，只是把内存数组换成 Prisma 查询。
