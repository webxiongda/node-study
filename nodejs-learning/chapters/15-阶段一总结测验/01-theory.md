# Day 15 — 阶段一总结：知识地图

## Node.js 阶段一完整知识体系（Day 01-14）

```
Node.js 全栈基础
│
├── 运行时原理（Day 01, 05）
│   ├── V8 引擎 + libuv 架构
│   ├── 单线程 + 非阻塞 I/O
│   └── 事件循环六阶段 ⭐⭐⭐⭐
│       ├── timers → pending → idle → poll → check → close
│       ├── nextTick > Promise.then > setImmediate > setTimeout
│       └── I/O 内部：setImmediate 确定早于 setTimeout
│
├── 模块系统（Day 02）⭐⭐⭐
│   ├── CJS（require/exports/缓存）
│   ├── ESM（import/export/静态分析）
│   └── CJS vs ESM：加载时机、互操作、Tree Shaking
│
├── 核心 API（Day 03-04）
│   ├── fs/path/os：文件系统（fs/promises 推荐）
│   ├── EventEmitter：事件驱动、内存泄漏防范
│   └── Stream：四种类型、pipe、背压 ⭐⭐
│
├── 异步编程（Day 06）⭐⭐⭐⭐
│   ├── Promise 四兄弟：all/allSettled/race/any
│   ├── async/await 并发陷阱（forEach + async）
│   ├── 并发限制（asyncPool）
│   └── 重试机制（指数退避）
│
├── HTTP 服务开发（Day 07-09）
│   ├── HTTP 协议：方法语义、状态码、CORS ⭐⭐
│   ├── 路由系统：正则匹配、参数提取 ⭐⭐
│   ├── 中间件模式：next()、错误中间件、顺序 ⭐⭐⭐
│   └── 请求体解析、大小限制
│
├── 工程化（Day 10-12）
│   ├── 项目结构：分层、单一职责
│   ├── TypeScript：strict、interface/type、类型守卫 ⭐⭐
│   └── RESTful 设计：URL规范、统一响应、版本化 ⭐⭐
│
└── 生产就绪（Day 13-14）
    ├── 多核利用：cluster / worker_threads ⭐⭐⭐
    ├── 错误处理：自定义 Error 类、全局兜底 ⭐⭐
    └── Graceful Shutdown：SIGTERM 处理 ⭐⭐
```

## 面试题速查表

| 题目 | 答案关键词 | 对应 Day |
|------|----------|---------|
| Node.js 单线程高并发 | libuv、事件循环、非阻塞 I/O | 01, 05 |
| 事件循环六阶段 | timers/poll/check + nextTick/Promise | 05 |
| CJS vs ESM | 同步 vs 静态、缓存、互操作 | 02 |
| Promise.all vs allSettled | fail-fast vs 全部等待 | 06 |
| forEach + async 陷阱 | forEach 不等 Promise，用 Promise.all + map | 06 |
| Express 中间件原理 | 数组 + next() + 四参错误处理 | 09 |
| 401 vs 403 | 未认证 vs 已认证无权限 | 07 |
| cluster vs worker_threads | 多进程 vs 多线程，HTTP vs CPU计算 | 13 |
| Graceful Shutdown | SIGTERM → server.close → exit | 14 |
| Stream 背压 | write()=false → pause → drain → resume | 04 |
