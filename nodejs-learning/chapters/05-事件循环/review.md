# Day 05 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| 单线程高并发 | JS 单线程，I/O 委托给 libuv/OS，通过事件循环驱动回调 |
| 六个阶段 | timers → pending → idle → poll → check → close |
| poll 阶段 | 等待 I/O，有 setImmediate 则退出等待 |
| nextTick | 阶段之间立即执行，优先级最高，可导致饥饿 |
| 微任务顺序 | nextTick > Promise.then > setImmediate > setTimeout |
| I/O 内部顺序 | setImmediate 确定早于 setTimeout |
| 阻塞来源 | 同步 CPU 计算（JSON.parse 大数据、循环）、同步 fs API |

## 易错点

1. 非 I/O 环境中 `setImmediate` vs `setTimeout(0)` 顺序不确定，I/O 回调内是确定的（setImmediate 先）
2. `process.nextTick` 在微任务（Promise）之前执行
3. `await` 不阻塞事件循环，只是挂起当前 async 函数
4. `fs.readFile` 不阻塞事件循环，但 `fs.readFileSync` 会

## 高频面试题（全部需要能流利作答）

**Q1: 事件循环的六个阶段？**

timers（setTimeout/setInterval）→ pending callbacks → idle/prepare → poll（I/O）→ check（setImmediate）→ close callbacks。

**Q2: process.nextTick 和 setImmediate 的区别？**

nextTick 在当前阶段结束后立即执行（比微任务还快）；setImmediate 在 check 阶段执行（I/O 之后）。nextTick 可能饿死事件循环。

**Q3: 在 I/O 回调中，setTimeout(0) 和 setImmediate 谁先？**

setImmediate 先，因为 poll → check → timers 的顺序。

**Q4: Node.js 如何处理 CPU 密集型任务？**

选项：① worker_threads ② 独立进程（child_process fork）③ setImmediate 分片（合作式调度）。

**Q5: 什么情况下用 process.nextTick 而不是 Promise.resolve().then？**

nextTick 用于需要在当前操作（如构造函数）完成后、但在任何 I/O 或微任务之前执行的代码。典型场景：在构造函数中发出事件（确保调用方先注册监听器）。

## 自测题

1. `setTimeout(fn, 0)` 和 `setTimeout(fn, 1)` 有区别吗？
2. 如果在 nextTick 回调中递归调用 nextTick，会发生什么？
3. `libuv` 的线程池默认有几个线程？如何修改？
4. 顶层的 `await` 在 ESM 中可以用吗？它会阻塞事件循环吗？

## 下一章建议

Day 06（异步编程）是 Day 05 的实践延伸，重点在 Promise 高级用法和并发控制。`Promise.all` vs `Promise.allSettled` vs `Promise.race` vs `Promise.any` 是面试常考点。
