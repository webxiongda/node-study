# Day 14 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| 自定义错误类 | 继承 Error，加 status/code，captureStackTrace |
| 错误中间件 | 四参数，放最后，4xx 不记日志，5xx 记 |
| uncaughtException | 同步异常兜底，捕获后应退出 |
| unhandledRejection | Promise 未处理，Node 15+ 默认退出 |
| Graceful Shutdown | SIGTERM → server.close → 释放资源 → exit(0) |
| 调试工具 | --inspect Chrome DevTools / VS Code 调试 |

## 易错点

1. `uncaughtException` 后继续运行是危险的（进程状态不可预知）
2. 错误响应中不要暴露 stack trace（生产环境）
3. `server.close()` 不关闭 keep-alive 连接，需要额外处理
4. async 路由 handler 中的异常要 try/catch 后 next(err)，否则变成 unhandledRejection

## 高频面试题

**Q1: Graceful Shutdown 是什么？为什么重要？**

收到停止信号后先停止新请求，等待现有请求完成，再关闭资源退出。Kubernetes 滚动更新依赖它，不实现会导致用户请求中断。

**Q2: 如何避免 unhandledRejection？**

所有 async 函数都要 try/catch；Express 中用统一错误处理中间件；使用 ESLint `no-floating-promises` 规则。

**Q3: 生产中如何调试？**

结构化日志（Pino/Winston）+ APM（Sentry/Datadog）+ 必要时 SSH 隧道远程 inspect。

## 自测题

1. `Error.captureStackTrace(this, this.constructor)` 的作用是什么？
2. SIGTERM 和 SIGKILL 的区别是什么？
3. 如何测试 graceful shutdown？
4. `console.dir(obj, { depth: null })` 和 `console.log(obj)` 的区别？

## 下一章建议

Day 15 是阶段一总结与测验。把 Day 01-14 的知识梳理成知识地图，然后完成三个限时编码挑战，自我评估是否真正掌握。
