# Day 11 — 验收自测题

---

### 题 1（概念题）
`interface` 和 `type` 的主要区别是什么？各举一个只能用其中一种的场景。

---

### 题 2（实操题）
给以下函数加上正确的 TypeScript 类型（不使用 any）：

```typescript
// 将对象数组按指定 key 分组
function groupBy(items, key) {
  const result = {};
  for (const item of items) {
    const k = item[key];
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}
```

---

### 题 3（实操题）
以下代码有类型错误，找出并修复：

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

function getEmail(user: User): string {
  return user.email.toUpperCase(); // 问题在哪里？
}
```

---

### 题 4（概念题）
`unknown` 和 `any` 的区别是什么？处理用户输入（如 `req.body`）应该用哪个？

---

### 题 5（项目应用题）
你要实现一个函数 `safeParseInt(value: unknown): number | null`，将任意输入转换为整数，无法转换时返回 null。写出类型安全的实现。

---

## 参考答案

### 题 1
`interface`：对象形状，可多次声明合并（Declaration Merging），可以 `extends` / `implements`。
`type`：更灵活，支持联合类型、交叉类型、映射类型、条件类型等。

只能用 `interface` 的场景：扩展第三方类型（如 `declare module 'express'`）。
只能用 `type` 的场景：联合类型 `type Status = 'pending' | 'done' | 'failed'`。

### 题 2
```typescript
function groupBy<T, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = String(item[key]);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

// 使用
interface User { id: number; role: string; }
const users: User[] = [{ id: 1, role: 'admin' }, { id: 2, role: 'user' }];
const byRole = groupBy(users, 'role'); // byRole 类型是 Record<string, User[]>
```

### 题 3
问题：`user.email` 是 `string | undefined`（可选字段），直接调用 `.toUpperCase()` 会报 `Cannot read property of undefined`。

修复方案：
```typescript
// 方案1：空值检查
function getEmail(user: User): string {
  if (!user.email) throw new Error('User has no email');
  return user.email.toUpperCase();
}

// 方案2：空值合并
function getEmail(user: User): string {
  return (user.email ?? '').toUpperCase();
}

// 方案3：返回可选
function getEmail(user: User): string | undefined {
  return user.email?.toUpperCase();
}
```

### 题 4
`any`：完全绕过类型系统，可以赋给任何类型，也可以访问任意属性，危险。
`unknown`：安全的顶级类型，使用前必须先做类型检查（`typeof`、`instanceof`、类型守卫），强制你处理不确定性。

处理用户输入用 `unknown`，因为你必须显式验证数据结构才能使用。

### 题 5
```typescript
function safeParseInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    return isNaN(n) ? null : n;
  }
  return null;
}
```
