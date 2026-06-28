# Day 05 — 验收自测题

> ⭐ 这是面试最高频考点，必须全部独立答对。

---

### 题 1（概念题）
按照执行顺序排列以下输出（填写顺序编号 1-6）：

```javascript
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
process.nextTick(() => console.log('D'));
setImmediate(() => console.log('E'));
console.log('F');
```

顺序：___

---

### 题 2（概念题）
在 I/O 回调内部，`setTimeout(fn, 0)` 和 `setImmediate(fn)` 谁先执行？为什么？

---

### 题 3（实操题）
以下代码的输出是什么？（逐行分析）

```javascript
process.nextTick(() => {
  console.log('nextTick 1');
  Promise.resolve().then(() => console.log('promise in nextTick'));
  process.nextTick(() => console.log('nextTick 2'));
});

Promise.resolve().then(() => {
  console.log('promise 1');
  process.nextTick(() => console.log('nextTick in promise'));
});
```

---

### 题 4（概念题）
以下哪些操作会阻塞事件循环？（多选）

A. `fs.readFile('./file', callback)` — 读取 1GB 文件  
B. `JSON.parse(largeJsonString)` — 解析 100MB 的 JSON  
C. `await fetch('https://api.example.com/data')` — 等待网络请求  
D. `for (let i = 0; i < 1e9; i++) {}` — 10亿次循环  
E. `new Promise(resolve => setTimeout(resolve, 5000))` — 等待5秒  

---

### 题 5（项目应用题）
你的 Node.js API 服务有一个接口需要计算报表（CPU 密集，需要 3 秒），导致其他请求都被阻塞。
列出至少 2 种解决方案，并说明各自的适用场景。

---

## 参考答案

### 题 1
**顺序：A → F → D → C → E → B**（setImmediate 和 setTimeout 在非 I/O 环境中顺序不完全确定，通常 E 在 B 前，但理论上不保证）

分析：
- `A`、`F` — 同步代码
- `D` — nextTick 队列（微任务前清空）
- `C` — Promise.then（微任务队列）
- `E` — check 阶段（setImmediate）
- `B` — timers 阶段（setTimeout）

### 题 2
**`setImmediate` 先执行。**

原因：`readFile` 的回调在 poll 阶段执行。poll 阶段结束后，事件循环进入 check 阶段（执行 setImmediate），然后才回到 timers 阶段（执行 setTimeout）。在 I/O 回调中这个顺序是确定的。

### 题 3
```
nextTick 1
nextTick 2
promise in nextTick
promise 1
nextTick in promise
```

分析：
1. nextTick 队列先清空：执行 `nextTick 1`
2. 执行 nextTick 1 时又添加了 `nextTick 2` 和 `promise in nextTick`
3. nextTick 队列继续清空：`nextTick 2`
4. 现在 nextTick 队列空了，清空 microtask 队列：`promise in nextTick`（在 nextTick 里加的 promise）
5. 然后是外层的 `promise 1`
6. promise 1 里又加了 `nextTick in promise` — 在 microtask 处理完后清空 nextTick：`nextTick in promise`

### 题 4
**阻塞事件循环的：B、D**

- A ❌：`fs.readFile` 是异步的，I/O 由 libuv 线程池处理，不阻塞主线程
- B ✅：`JSON.parse` 是同步的 CPU 操作，在主线程执行，100MB JSON 可能耗时数百毫秒
- C ❌：`await fetch` 会挂起当前 async 函数，但不阻塞事件循环（等待网络，底层异步）
- D ✅：10亿次循环是纯 CPU 计算，完全在主线程运行，严重阻塞事件循环
- E ❌：`setTimeout` 在 timers 阶段处理，等待期间主线程处理其他事件，不阻塞

### 题 5

**方案1：Worker Threads（推荐）**
```javascript
const { Worker, isMainThread, parentPort } = require('worker_threads');
// 在 worker 中运行计算，不占用主线程
```
适用场景：计算密集型任务，需要 CPU 并行，如数据分析、图片处理。

**方案2：独立微服务**
将报表计算拆分为独立服务，主服务异步调用（消息队列或 HTTP）。
适用场景：任务可以异步返回结果，允许用户等待或轮询。

**方案3：setImmediate 分片**
将计算分成小批次，每批通过 setImmediate 让出事件循环。
适用场景：可以分片的顺序处理任务，不需要单独线程。

**方案4：child_process**
fork 子进程执行计算，通过 IPC 传递结果。
适用场景：和 worker_threads 类似，但进程隔离更彻底，更安全。
