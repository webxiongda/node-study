# Day 11 — 项目任务：用 TypeScript 重写 TODO API

## 任务说明

将 Day 10 的 `mini-todo-api` 用 TypeScript 完全重写，保持相同的 API 行为，但加上类型安全。

## 项目结构

```
todo-api-ts/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── types/
│   │   └── todo.ts        — Todo、CreateTodoDto、UpdateTodoDto 等接口
│   ├── middleware/
│   │   ├── logger.ts
│   │   ├── cors.ts
│   │   ├── bodyParser.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   └── todos.ts
│   ├── store.ts            — 类型化的数据操作
│   └── errors.ts           — 自定义错误类
```

## 验收标准

- [ ] `npx tsx src/index.ts` 可以启动
- [ ] `npx tsc --noEmit` 零报错（无类型错误）
- [ ] 所有函数的参数和返回值都有明确类型（无隐式 any）
- [ ] 用类型守卫验证 `req.body`
- [ ] 使用泛型实现 `paginate<T>` 分页工具函数
- [ ] API 行为与 Day 10 完全一致

## 常见坑

1. **`req.body` 的类型**：原生 `http.IncomingMessage` 没有 `body` 属性，需要扩展接口：
   ```typescript
   // 扩展 IncomingMessage
   interface ExtendedRequest extends http.IncomingMessage {
     body: unknown;
     params: Record<string, string>;
     query: Record<string, string>;
   }
   ```
2. **非空断言**：不要用 `!` 逃避检查，用 `if` 或 `??` 处理可能为 null/undefined 的值。
3. **tsconfig strict 模式**：第一次开启 strict 可能有很多报错，逐个修复，不要关掉。
