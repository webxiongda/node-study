# Day 01 — 复习文档

## 核心知识点总结

| 知识点 | 一句话总结 |
|--------|----------|
| Node.js 定位 | 基于 V8 的 JS 运行时，让 JS 跑在服务端 |
| 全局对象 | 浏览器是 `window`，Node.js 是 `global`/`globalThis` |
| process 对象 | Node.js 进程的入口，无浏览器等价物 |
| process.argv | 命令行参数数组，前两项固定，从 index 2 起是自定义参数 |
| process.cwd() | 运行命令时终端所在目录（可变） |
| __dirname | 脚本文件所在目录（固定） |
| process.exit(code) | 0=成功，非0=失败，exit 回调只能同步 |
| REPL | 交互式命令行，快速验证代码 |

## 易错点整理

1. `process.cwd()` vs `__dirname` — 从不同目录执行脚本时值不同，引用项目文件用 `__dirname`
2. `process.argv.slice(2)` — 不是 `slice(0)` 或 `slice(1)`，前两项是固定的 node 路径和脚本路径
3. `exit` 事件中不能用异步操作 — 事件循环此时已停止
4. 版本号比较不能用字符串比较

## 高频面试题

**Q1: Node.js 和浏览器中的 JavaScript 有什么区别？**

答：
- 运行环境不同：浏览器 vs 操作系统
- 全局对象不同：`window` vs `global`
- API 不同：浏览器有 DOM/BOM，Node.js 有 `fs`/`net`/`os` 等系统 API
- 模块系统不同：浏览器以 ESModule 为主，Node.js 支持 CommonJS + ESModule
- 用途不同：UI 渲染 vs API 服务/工具链

**Q2: Node.js 适合做什么？不适合做什么？**

答：
- 适合：I/O 密集型（REST API、实时通信 WebSocket、工具链）
- 不适合：CPU 密集型计算（大量数学运算、图像处理），因为单线程会阻塞事件循环（可用 worker_threads 解决，Day 13 讲）

**Q3: `process.cwd()` 和 `__dirname` 的区别？**

答：`cwd()` 是执行命令的终端目录（动态），`__dirname` 是脚本文件的物理目录（静态）。引用项目内部文件用 `__dirname`，读取用户当前目录用 `cwd()`。

**Q4: process.argv 是什么结构？**

答：数组。`argv[0]` = node 可执行文件路径，`argv[1]` = 当前脚本路径，`argv[2]` 起是用户自定义参数。

**Q5: Node.js 单线程如何处理高并发？**

答：通过事件循环 + 非阻塞异步 I/O。I/O 操作交给 libuv（底层使用 epoll/kqueue），JS 主线程不阻塞等待，而是注册回调，I/O 完成后再处理结果。（Day 05 深入讲解）

## 自测题（不含答案）

1. `process.platform` 在 macOS 上返回什么值？
2. 如何用一行代码获取命令行的第一个自定义参数？
3. `__filename` 和 `__dirname` 在 ESModule 中是否可用？
4. `process.memoryUsage()` 返回的 `rss` 是什么意思？

## 下一章学习建议

Day 02（模块系统）是 Node.js 面试的高频考点，重点关注：
- CommonJS 的 `require` 缓存机制
- CJS 和 ESM 不能混用的限制（`.mjs` vs `"type": "module"`）
- 循环依赖时会发生什么
