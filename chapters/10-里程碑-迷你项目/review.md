# Day 10 — 复习文档

## 阶段一前半段（Day 01-10）知识地图

```
Node.js 基础
├── 运行时原理
│   ├── V8 引擎 + libuv
│   ├── 单线程 + 非阻塞 I/O
│   └── 事件循环（六个阶段）⭐⭐⭐⭐
├── 模块系统
│   ├── CJS（require/exports）⭐⭐⭐
│   ├── ESM（import/export）
│   └── 模块缓存机制 ⭐⭐
├── 核心 API
│   ├── process 对象
│   ├── fs/path/os
│   ├── EventEmitter ⭐⭐
│   └── Stream（背压）⭐⭐
├── 异步编程 ⭐⭐⭐⭐
│   ├── Promise 四兄弟
│   ├── async/await 并发陷阱
│   └── 并发限制（asyncPool）
└── HTTP 服务开发
    ├── HTTP 方法/状态码 ⭐⭐
    ├── CORS ⭐⭐
    ├── 路由匹配（正则）⭐⭐
    └── 中间件模式 ⭐⭐⭐
```

## 面试常问的"手写"题汇总

| 题目 | 难度 | 对应知识 |
|------|------|---------|
| 手写 asyncPool | ⭐⭐⭐ | Day 06 |
| 手写 withTimeout | ⭐⭐ | Day 06 |
| 手写 withRetry（指数退避）| ⭐⭐⭐ | Day 06 |
| 解释事件循环六阶段 + 顺序题 | ⭐⭐⭐⭐ | Day 05 |
| 手写路由匹配器 | ⭐⭐⭐ | Day 08 |
| 手写中间件引擎 | ⭐⭐⭐ | Day 09 |
| 实现简单的 EventEmitter | ⭐⭐⭐ | Day 04 |

## 下一章建议

Day 11（TypeScript）是语言层面的升级，之前学的所有内容都要用 TypeScript 改写。重点：`tsconfig.json` 的服务端配置、类型守卫、接口定义。
