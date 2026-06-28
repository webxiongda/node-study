# Day 13 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| cluster | 多进程共享端口，多核 HTTP 服务首选 |
| worker_threads | 同进程线程，CPU 密集 JS 计算首选 |
| child_process.fork | 独立 Node.js 进程 + IPC 双向通信 |
| child_process.exec/spawn | 执行 shell 命令；spawn 适合大输出 |
| 线程 vs 进程 | 线程共享内存（快），进程隔离（安全）|
| PM2 cluster | 生产环境多核管理，`pm2 start app.js -i max` |

## 易错点

1. `worker_threads` 不能用于 I/O 密集型（I/O 已经是异步的，不需要线程）
2. `exec` 有缓冲区限制（默认 200KB），大输出用 `spawn`
3. `cluster.fork()` 是进程级别，每个 Worker 有独立内存，不能共享变量
4. Worker 线程崩溃会触发 `error` 事件，需要处理并重建 Worker

## 高频面试题

**Q1: Node.js 如何利用多核 CPU？**

答：cluster（多进程）或 worker_threads（多线程）。HTTP 服务用 cluster（每核一个 Worker 进程），CPU 密集计算用 worker_threads（线程池）。

**Q2: worker_threads 和 child_process 的区别？**

见 check.md 题 1。关键：线程共享内存，进程完全隔离。

**Q3: PM2 是什么？`pm2 start app.js -i max` 做了什么？**

答：PM2 是 Node.js 进程管理工具。`-i max` 按 CPU 核数启动 cluster 模式，自动负载均衡、进程守护（崩溃自动重启）、日志管理。

## 自测题

1. `os.cpus().length` 在你的机器上是多少？用它做什么？
2. `SharedArrayBuffer` 是什么？用 worker_threads 时什么场景会用到？
3. cluster 模式下，多个 Worker 进程的内存中各有一份数据，如何共享状态？
4. 什么是孤儿进程（zombie process）？

## 下一章建议

Day 14（错误处理与调试）是日常开发和线上排查的实用技能。重点是自定义错误类体系和 graceful shutdown（优雅退出），这在生产服务中非常重要。
