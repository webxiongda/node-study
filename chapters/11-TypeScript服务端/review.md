# Day 11 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| tsconfig strict | 必须开启，noImplicitAny + strictNullChecks |
| interface vs type | interface 用于对象形状，type 用于联合/复杂类型 |
| unknown vs any | unknown 安全（用前要检查），any 危险（绕过检查）|
| 类型守卫 | 收窄类型：typeof / instanceof / in / 自定义谓词函数 |
| 泛型 | 让函数/类适用于多种类型，如 `function wrap<T>(val: T): T[]` |
| Partial / Pick / Omit | 内置工具类型，生成 DTO 的利器 |
| tsx | 开发时运行 TS 文件，比 ts-node 快 |

## 易错点

1. 可选属性 `email?: string` 不能直接 `.toUpperCase()`，要先检查
2. `noImplicitAny` 下，回调参数也要声明类型：`arr.map((x: string) => ...)`
3. `JSON.parse()` 返回 `any`，处理后应该断言或使用类型守卫
4. `Record<string, T>` 的值访问可能是 `undefined`，开启 `noUncheckedIndexedAccess` 后会报错

## 高频面试题

**Q1: TS 中 interface 和 type 的区别？**

见 check.md 题 1。关键：interface 可以合并声明，type 支持联合类型。

**Q2: unknown 和 any 的区别？**

见 check.md 题 4。关键：unknown 用前必须类型检查，any 完全不检查。

**Q3: 什么是泛型约束？**

```typescript
// T 必须有 id 属性
function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}
```

**Q4: tsconfig 中 strict 开启了哪些检查？**

主要：noImplicitAny、strictNullChecks、strictFunctionTypes、strictPropertyInitialization。

## 自测题

1. `Partial<User>` 是什么类型？`Required<Partial<User>>` 呢？
2. 如何让函数接受 `string | number` 参数，但内部分别处理？
3. `as const` 的作用是什么？
4. 什么是 Declaration Merging？

## 下一章建议

Day 12（RESTful 设计）是面试中"你如何设计 API"的直接考点。URL 命名规范、分页参数格式、错误响应格式——每个公司都有不同标准，但理解通用准则才能在面试中答得自信。
