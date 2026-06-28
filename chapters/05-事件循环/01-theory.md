# Day 05 — 事件循环深度解析 · 理论文档

> ⭐⭐⭐⭐ 面试最高频考点，必须深度掌握。

## 核心概念

### 1. 为什么是单线程，却能高并发？

Node.js JS 主线程是单线程的（一次只运行一段 JS 代码），但 **I/O 操作**（文件读写、网络请求、数据库查询）是由底层的 **libuv** 交给操作系统的异步接口或线程池来完成的。

```
JS 主线程（单线程）
   ↓ 发起 I/O 请求
libuv（事件循环 + 线程池）
   ↓ 分发到 OS 或线程池
操作系统内核（epoll/kqueue/IOCP）
   ↓ I/O 完成，通知 libuv
libuv → 将回调放入事件队列
   ↓
JS 主线程处理回调
```

核心点：**JS 不等待 I/O，而是注册回调，继续处理其他任务。** I/O 完成后，回调被放入队列，JS 主线程空闲时再来处理。

---

### 2. 事件循环的六个阶段（⭐ 必背）

```
   ┌───────────────────────────┐
┌─>│           timers           │  ← setTimeout / setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks      │  ← 上一轮延迟的 I/O 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare        │  ← 内部使用
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll             │  ← 等待新的 I/O 事件（核心）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check            │  ← setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks       │  ← socket.on('close', ...)
   └───────────────────────────┘
```

**每个阶段的作用：**

| 阶段 | 执行的内容 |
|------|----------|
| **timers** | 执行已到期的 `setTimeout` 和 `setInterval` 回调 |
| **pending callbacks** | 执行上一轮 poll 阶段延迟的 I/O 错误回调 |
| **idle/prepare** | 内部使用，开发者无需关注 |
| **poll** | 获取新的 I/O 事件；如果队列空则等待；如果有 `setImmediate` 则结束等待 |
| **check** | 执行 `setImmediate` 的回调 |
| **close callbacks** | 执行 `close` 事件（如 `socket.destroy()`）|

**poll 阶段的特殊逻辑（面试考点）：**
- 如果 timers 阶段没有到期的定时器，且 poll 队列为空：
  - 有 `setImmediate`：离开 poll，进入 check 阶段
  - 没有 `setImmediate`：在 poll 阶段等待新的 I/O 事件（阻塞）

---

### 3. process.nextTick 和 Promise.then 的特殊性（⭐ 必背）

`process.nextTick` 和 `Promise.then` **不属于六个阶段**，它们在每个阶段**结束后**、下一个阶段**开始前**立即执行，优先级更高。

```
每个阶段结束后：
1. 清空 nextTick 队列（全部执行完）
2. 清空 microtask 队列（Promise.then 等）
3. 进入下一阶段
```

**执行优先级（从高到低）：**
1. `process.nextTick`
2. `Promise.then` / `queueMicrotask`
3. `setImmediate`
4. `setTimeout(fn, 0)`

---

### 4. 经典执行顺序题（面试必考）

**例题 1：基础顺序**
```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

process.nextTick(() => console.log('4'));

console.log('5');
```

输出：`1 5 4 3 2`

分析：
- `1`、`5` — 同步代码立即执行
- `4` — nextTick 队列（微任务前）
- `3` — Promise.then（微任务）
- `2` — timers 阶段的 setTimeout

---

**例题 2：I/O 回调中 setTimeout vs setImmediate**
```javascript
const fs = require('fs');

fs.readFile('./file.txt', () => {
  setTimeout(() => console.log('setTimeout'), 0);
  setImmediate(() => console.log('setImmediate'));
});
```

输出：**始终是 `setImmediate` 先于 `setTimeout`**

原因：`readFile` 回调在 poll 阶段执行，poll 阶段结束后直接进入 check 阶段（setImmediate），然后才回到 timers 阶段（setTimeout）。

---

**例题 3：在主模块中 setTimeout(0) vs setImmediate**
```javascript
// 不在 I/O 回调中
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));
```

输出：**不确定**，取决于事件循环启动时 timers 是否已到期。通常 `setTimeout` 先，但不保证。

---

**例题 4：nextTick 在 Promise 之前**
```javascript
Promise.resolve().then(() => {
  console.log('promise 1');
  process.nextTick(() => console.log('nextTick inside promise'));
});

process.nextTick(() => {
  console.log('nextTick 1');
  Promise.resolve().then(() => console.log('promise inside nextTick'));
});
```

输出：
```
nextTick 1
promise inside nextTick
promise 1
nextTick inside promise
```

---

### 5. 阻塞事件循环的危害

```javascript
// ❌ 危险：阻塞事件循环
app.get('/data', (req, res) => {
  // 计算斐波那契，耗时 2 秒
  const result = fibonacci(45);
  res.json({ result });
});
// 在这 2 秒内，所有其他请求都被阻塞！
```

解决方案：
- 将 CPU 密集型任务移到 `worker_threads`（Day 13）
- 使用 `setImmediate` 分片处理大任务（cooperative scheduling）

---

## 面试高频问题

**Q1: 说出事件循环的六个阶段，以及每个阶段执行什么。**

见上方"六个阶段"章节。

**Q2: process.nextTick 和 setImmediate 的区别？**

答：
- `process.nextTick`：在当前操作完成后，**下一个阶段开始前**立即执行。优先级最高，可能饿死事件循环（如果递归调用 nextTick）。
- `setImmediate`：在 **check 阶段**（I/O 之后）执行，给 I/O 回调执行机会后才运行。

**Q3: 为什么说 Node.js 是单线程的，又说它能处理高并发？**

答：JS 代码执行是单线程的，但 I/O 操作通过 libuv 的线程池（4 个线程）或操作系统内核的异步接口（epoll/kqueue）处理。单线程不等待 I/O，而是将 I/O 委托出去后立即处理下一个任务，通过事件循环驱动回调执行，实现高并发。适合 I/O 密集型，不适合 CPU 密集型。

**Q4: 在 I/O 回调中，setTimeout(0) 和 setImmediate 谁先执行？**

答：`setImmediate` 先。I/O 回调在 poll 阶段执行，poll 结束后进入 check 阶段（setImmediate），然后绕回 timers 阶段（setTimeout）。

**Q5: process.nextTick 使用不当可能造成什么问题？**

答：如果在 nextTick 回调中又调用 nextTick，会导致 nextTick 队列永远不清空，事件循环无法进入下一阶段，产生"饥饿"（starvation），其他回调永远无法执行。
