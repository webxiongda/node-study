# Day 23 — Prisma ORM 入门：复习文档

## 核心知识点总结

| 操作 | Prisma API |
|------|-----------|
| 查询列表 | `findMany({ where, include/select, orderBy, skip, take })` |
| 查询单个 | `findUnique({ where: { id } })` / `findUniqueOrThrow` |
| 创建 | `create({ data })` |
| 更新 | `update({ where, data: { field: { increment: 1 } } })` |
| 删除 | `delete({ where: { id } })` |
| 计数 | `count({ where })` |
| 事务 | `$transaction([query1, query2])` |

## 高频面试题

**Q1：Prisma 如何避免 N+1 问题？**
使用 `include` 代替循环查询。Prisma 会将关联查询优化为使用 `IN` 的批量查询，一次性加载所有关联数据，而不是每条记录单独发一次查询。

**Q2：`findUnique` 和 `findFirst` 的区别？**
`findUnique` 只能用 `@id` 或 `@unique` 字段，TypeScript 层面就能保证查询条件的唯一性；`findFirst` 可以用任意 `where` 条件，返回第一个匹配。

**Q3：Prisma 的 `select` 和 `include` 有什么区别？**
`select` 精确指定返回哪些字段（排除其他，包含关联），适合排除敏感字段；`include` 在返回所有字段的基础上额外包含关联数据。两者在同一层不能同时用。

**Q4：`prisma migrate dev` 和 `prisma migrate deploy` 的区别？**
`migrate dev` 用于开发：会交互式创建迁移、应用迁移、重置数据库、运行 seed；`migrate deploy` 用于生产：只应用已有的迁移文件，不修改 schema，不重置数据库，安全。

## 自测题（不看答案）

1. 如何用 Prisma 同时查询文章列表和总数（用于分页）？
2. `@@index` 在 schema 里和 `CREATE INDEX` 在 SQL 里有什么关系？
3. 多对多关联时，用 `connect` 和 `create` 的区别？
4. Prisma schema 里的 `@map` 和 `@@map` 是干什么的？

## 下一章建议

Day 24：Prisma 迁移与关联——复杂关联（自关联/多对多显式中间表）、迁移策略（添加字段/修改类型/重命名）、`onDelete` 策略、嵌套写入。
