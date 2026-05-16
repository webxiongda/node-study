# Day 15 — 阶段一总结复习

## 阶段一完成！

你已经完成了 Node.js 全栈基础的 15 天学习。

## 必须能流利回答的面试题清单

以下问题是全栈岗位面试高频题，不看笔记能流利回答才算真正掌握：

**事件循环：**
- Node.js 的事件循环有哪六个阶段？
- process.nextTick 和 setImmediate 的区别？
- 在 I/O 回调中，setTimeout(0) 和 setImmediate 谁先？为什么？
- 为什么 Node.js 单线程能处理高并发？

**异步编程：**
- Promise.all 和 Promise.allSettled 的区别？
- forEach + async 有什么问题？
- 如何实现带超时的 Promise？
- 如何限制并发数（asyncPool）？

**HTTP / REST：**
- 401 和 403 的区别？
- 什么情况下会触发 CORS 预检请求？
- PUT 和 PATCH 的区别？
- 创建资源成功返回什么状态码？

**框架底层：**
- Express 中间件是如何工作的？
- 错误处理中间件有什么特殊之处（四参数）？
- Express 路由匹配的原理？

**生产相关：**
- 什么是 Graceful Shutdown？
- cluster 和 worker_threads 各适合什么场景？
- 如何防止 Node.js 进程因 uncaughtException 崩溃？

## 复习计划更新

请在 `review-plan.md` 中记录 Day 01-15 的完成日期，按间隔复习计划安排复习。

## 下一阶段预告

**Day 16-20：NestJS 框架**
- 企业级 Node.js 框架
- IoC/DI 依赖注入
- Decorator 装饰器
- 博客系统后端（你的第一个项目）
