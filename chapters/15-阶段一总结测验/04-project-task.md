# Day 15 — 项目任务：阶段一自我评估 + 进入 Day 16 准备

## 任务：完成阶段一知识评估

### Step 1：回答以下开放题（不看笔记，自己组织语言）

1. 用 3 句话解释"为什么 Node.js 是单线程的，但能处理高并发"
2. 用 2 分钟讲清楚"Express 中间件是什么，以及错误处理中间件如何工作"
3. 比较 `Promise.all` 和 `Promise.allSettled`，各举一个适合的业务场景

### Step 2：代码速写挑战（各用 5 分钟）

1. 手写 `asyncPool(limit, items, fn)` — 并发限制
2. 手写 `withRetry(fn, maxRetries, delay)` — 指数退避重试
3. 手写一个简单的 EventEmitter（`on`、`emit`、`off`）

### Step 3：自评打分

| 知识模块 | 自评（1-5）| 面试权重 | 行动计划 |
|---------|----------|---------|---------|
| 事件循环 | / | ⭐⭐⭐⭐ | |
| Promise 并发控制 | / | ⭐⭐⭐⭐ | |
| 模块系统 CJS/ESM | / | ⭐⭐⭐ | |
| 中间件模式 | / | ⭐⭐⭐ | |
| HTTP 方法/状态码 | / | ⭐⭐ | |
| cluster/worker_threads | / | ⭐⭐⭐ | |
| TypeScript 基础 | / | ⭐⭐ | |

3 分以下的模块在进入 Day 16（NestJS）前要复习！

## Day 16 预习要点

Day 16 开始 NestJS，预先了解以下概念有助于理解：
- **IoC（控制反转）**：依赖不由调用者创建，而是由容器注入
- **DI（依赖注入）**：`class UserService { constructor(private db: Database) {} }` — 由框架传入
- **装饰器（Decorator）**：`@Controller('/users')`、`@Get('/:id')` — TypeScript 实验性特性
