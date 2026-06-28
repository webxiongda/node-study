# Day 05 — 实操 Demo

## Demo 1：执行顺序实验

### 实操目标
亲手验证各种异步 API 的执行顺序，建立直觉。

### 代码
```javascript
// order-experiment.js
console.log('[同步] 1 - 开始');

// macrotask
setTimeout(() => console.log('[setTimeout] 2'), 0);
setImmediate(() => console.log('[setImmediate] 3'));

// microtask
Promise.resolve()
  .then(() => console.log('[Promise.then] 4'))
  .then(() => console.log('[Promise.then 链式] 5'));

// 最高优先级微任务
process.nextTick(() => {
  console.log('[nextTick] 6');
  // nextTick 里再加 nextTick
  process.nextTick(() => console.log('[nextTick 嵌套] 7'));
});

console.log('[同步] 8 - 结束');

// 预测输出，然后运行验证：
// 1, 8, 6, 7, 4, 5, 3, 2（大致顺序，setImmediate 和 setTimeout 的相对顺序在非 I/O 环境下不确定）
```

---

## Demo 2：I/O 回调中的顺序

### 代码
```javascript
const fs = require('fs');

// 写一个测试文件
fs.writeFileSync('/tmp/test-event-loop.txt', 'hello');

// 在 I/O 回调中对比 setTimeout 和 setImmediate
fs.readFile('/tmp/test-event-loop.txt', () => {
  console.log('=== I/O 回调内部 ===');
  
  setTimeout(() => console.log('setTimeout（在 I/O 内）'), 0);
  setImmediate(() => console.log('setImmediate（在 I/O 内）'));
  
  Promise.resolve().then(() => console.log('Promise.then（在 I/O 内）'));
  process.nextTick(() => console.log('nextTick（在 I/O 内）'));
  
  console.log('同步代码（在 I/O 内）');
});

// 输出：
// === I/O 回调内部 ===
// 同步代码（在 I/O 内）
// nextTick（在 I/O 内）
// Promise.then（在 I/O 内）
// setImmediate（在 I/O 内）  ← setImmediate 在 setTimeout 之前（确定的！）
// setTimeout（在 I/O 内）
```

---

## Demo 3：setImmediate 分片处理大任务（避免阻塞）

### 实操目标
演示如何用 setImmediate 实现"合作式调度"，让大任务不阻塞事件循环。

### 代码
```javascript
// 模拟一个 CPU 密集的大任务：处理 100 万条数据
const data = Array.from({ length: 1_000_000 }, (_, i) => i);
let processed = 0;

// ❌ 阻塞方式：一次性处理，阻塞事件循环约 500ms
function processBlocking() {
  const start = Date.now();
  const result = data.filter(n => n % 2 === 0).length;
  console.log(`阻塞方式: ${Date.now() - start}ms, 结果: ${result}`);
}

// ✅ 分片方式：每批处理 1000 条，让出控制权
function processChunked(arr, chunkSize = 10000) {
  let index = 0;
  let evenCount = 0;
  const start = Date.now();

  function processNextChunk() {
    const end = Math.min(index + chunkSize, arr.length);
    for (let i = index; i < end; i++) {
      if (arr[i] % 2 === 0) evenCount++;
    }
    index = end;

    if (index < arr.length) {
      setImmediate(processNextChunk); // 让出，下一轮继续
    } else {
      console.log(`分片方式: ${Date.now() - start}ms, 结果: ${evenCount}`);
    }
  }

  processNextChunk();
}

// 对比：阻塞期间下面这行输出会被延迟
setInterval(() => process.stdout.write('.'), 50); // 每 50ms 打印一个点

setTimeout(() => {
  console.log('\n--- 测试阻塞方式 ---');
  processBlocking();
}, 100);

setTimeout(() => {
  console.log('\n--- 测试分片方式 ---');
  processChunked(data);
}, 2000);
```
