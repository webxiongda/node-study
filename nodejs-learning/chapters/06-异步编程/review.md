# Day 06 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| Promise.all | 全成功才成功，一失败立即失败 |
| Promise.allSettled | 全部完成，包含每个成败结果 |
| Promise.race | 第一个完成（成败皆可）就结束 |
| Promise.any | 第一个成功才结束，全失败才 reject |
| 并行 vs 串行 | 连续 await 是串行；先创建 Promise 再 await 是并行 |
| forEach + async | forEach 不等待异步，用 Promise.all + map |
| asyncPool | 限制并发：Promise.race 等一个空位再加新任务 |
| 指数退避 | delay × 2^(attempt-1)，避免同时重试打垮服务 |

## 易错点

1. `await Promise.all([fn1(), fn2()])` — `fn1()` 和 `fn2()` 调用时就已经并发了
2. `for...of + await` = 串行；`Promise.all(arr.map(...))` = 并行
3. `forEach` 的回调是 async 时，forEach 本身仍然是同步的
4. `Promise.any` 全部失败时 reject 的是 `AggregateError`，不是普通 Error

## 高频面试题

**Q1: 如何让多个异步操作并发执行？**

答：使用 `Promise.all`。关键是要**同时创建**所有 Promise，而不是逐个 await：
```javascript
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
```

**Q2: Promise.all 和 Promise.allSettled 的区别？**

见 03-check.md 题 1。

**Q3: 如何实现带限流的批量请求？**

答：实现 `asyncPool(limit, items, fn)` — 维护一个运行中的 Promise 集合，当集合满时用 `Promise.race` 等一个完成后再添加新任务。

**Q4: 如何实现超时控制？**

答：`Promise.race([actualPromise, timeoutPromise])`，timeoutPromise 是 setTimeout 后 reject 的 Promise。

**Q5: 什么是指数退避？为什么重试要用？**

答：每次重试等待时间加倍（1s, 2s, 4s...）。防止所有客户端同时重试打垮刚恢复的服务（雷暴效应）。

## 自测题

1. `Promise.race([p1, p2])` 中 p2 更快且成功，p1 后来 reject，整体结果是什么？
2. `async function foo() { return 42; }` 调用 `foo()` 的返回值是什么类型？
3. 未被捕获的 Promise rejection 在 Node.js 中会怎样？
4. `await` 只能在 `async` 函数内使用吗？

## 下一章建议

Day 07（HTTP 协议基础）是从"工具"到"服务端开发"的转折点。重点是 HTTP 方法语义（GET/POST/PUT/PATCH/DELETE 的区别）、状态码（201 vs 200、401 vs 403）、CORS。这些在面试中和项目中都天天用。
