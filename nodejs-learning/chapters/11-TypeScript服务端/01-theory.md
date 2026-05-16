# Day 11 — TypeScript 服务端开发 · 理论文档

## 核心概念

### 1. 为什么服务端需要 TypeScript？

- **类型安全**：`req.body` 是 `any`，加了类型后编译器能发现拼写错误
- **IDE 自动补全**：知道 `user.email` 的类型，减少调试时间
- **重构安全**：改一个接口名，所有用到的地方都会报错
- **文档即代码**：接口类型就是最好的 API 文档

---

### 2. tsconfig.json 服务端关键配置

```json
{
  "compilerOptions": {
    "target": "ES2022",          // 输出 ES 版本（Node 18+ 支持 ES2022）
    "module": "CommonJS",        // Node.js 默认用 CJS
    "lib": ["ES2022"],           // 可用的 TS 内置类型库
    "outDir": "./dist",          // 编译输出目录
    "rootDir": "./src",          // 源码目录
    "strict": true,              // 开启所有严格检查（必须）
    "esModuleInterop": true,     // 允许 import x from 'x'（默认只支持 * as x）
    "resolveJsonModule": true,   // 允许 import json
    "skipLibCheck": true,        // 跳过 node_modules 类型检查（速度更快）
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,       // 禁止隐式 any（已包含在 strict 中）
    "strictNullChecks": true,    // null/undefined 要显式处理（已包含在 strict 中）
    "noUnusedLocals": true,      // 未使用变量报错
    "noUnusedParameters": false  // 未使用参数（服务端常有 req 用不到，关掉）
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 3. 开发工具：tsx（取代 ts-node）

```bash
npm install -D typescript tsx @types/node

# 运行（不需要编译）
npx tsx src/index.ts

# 监听模式
npx tsx --watch src/index.ts
```

**tsx vs ts-node：**
- `tsx` 更快（基于 esbuild），不做类型检查（纯转译）
- `ts-node` 做类型检查，慢
- 开发时用 `tsx`，提交前用 `tsc --noEmit` 做类型检查

---

### 4. API 类型定义

**请求/响应类型：**
```typescript
// types/todo.ts
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CreateTodoDto {
  title: string;
}

export interface UpdateTodoDto {
  title?: string;
  completed?: boolean;
}

// 统一响应格式
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**类型守卫（验证用户输入）：**
```typescript
function isCreateTodoDto(body: unknown): body is CreateTodoDto {
  return (
    typeof body === 'object' &&
    body !== null &&
    'title' in body &&
    typeof (body as { title: unknown }).title === 'string' &&
    (body as { title: string }).title.trim().length > 0
  );
}

// 使用
if (!isCreateTodoDto(req.body)) {
  throw new ValidationError('title is required and must be a non-empty string');
}
// 这里 req.body 的类型被收窄为 CreateTodoDto
const todo = createTodo(req.body.title);
```

---

### 5. 扩展 Express 的类型（生产中常用）

```typescript
// types/express.d.ts
import { User } from './user';

declare global {
  namespace Express {
    interface Request {
      user?: User;  // 认证后挂上去
    }
  }
}
```

这样 `req.user` 在所有路由中都有类型提示。

---

## 面试高频问题

**Q1: TypeScript 的 `strict` 模式打开了哪些检查？**

答：包含：`noImplicitAny`（禁止隐式 any）、`strictNullChecks`（null/undefined 需显式处理）、`strictFunctionTypes`、`strictPropertyInitialization` 等。其中 `strictNullChecks` 是最重要的，防止 NPE（null pointer exception）。

**Q2: `interface` 和 `type` 的区别？**

答：
- `interface` 可以 extends 和 implements，可以多次声明合并
- `type` 更灵活，支持联合类型、映射类型、条件类型等
- 推荐：对象形状用 `interface`，复杂类型用 `type`

**Q3: 什么是类型守卫？**

答：通过运行时检查，让 TypeScript 在该分支中"收窄"变量类型。实现方式：`typeof`、`instanceof`、`in` 运算符，或自定义的 `(x): x is T` 函数。

**Q4: `unknown` 和 `any` 的区别？**

答：`any` 完全绕过类型检查；`unknown` 类型安全的顶级类型，使用前必须先做类型判断或断言。处理外部输入（用户、API）用 `unknown`，不用 `any`。
