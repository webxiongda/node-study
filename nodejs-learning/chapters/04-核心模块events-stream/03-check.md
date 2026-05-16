# Day 04 — 验收自测题

---

### 题 1（概念题）
以下说法哪些正确？（多选）

A. EventEmitter 默认允许无限个监听器  
B. `once` 注册的监听器触发后自动移除  
C. Stream 的 `pipe` 会自动处理背压  
D. Buffer 的 `length` 属性返回字符数  
E. Transform 流既可读又可写  

---

### 题 2（概念题）
什么是背压（Backpressure）？如果不处理会导致什么问题？

---

### 题 3（实操题）
用 EventEmitter 写一个 `Logger` 类，支持：
- `logger.log(msg)` — 触发 `log` 事件，附带时间戳
- 外部可以 `logger.on('log', callback)` 监听

---

### 题 4（实操题）
以下代码有什么问题？如何修复？

```javascript
class MyService extends EventEmitter {
  start() {
    setInterval(() => {
      this.on('data', (d) => console.log(d));
    }, 1000);
  }
}
const svc = new MyService();
svc.start();
```

---

### 题 5（项目应用题）
你需要处理一个 1GB 的日志文件，统计其中包含 `ERROR` 的行数。
写出关键代码思路（不需要完整实现），说明为什么不能用 `fs.readFile`。

---

## 参考答案

### 题 1
**正确：B、C、E**
- A ❌：默认最大 10 个，超过会打印警告（不是报错）
- B ✅：`once` 触发后自动调用 `removeListener`
- C ✅：`pipe` 内部监听 `drain` 事件自动处理背压
- D ❌：`Buffer.length` 是**字节数**，'你好' 是 6 字节（UTF-8），但字符数是 2
- E ✅：Transform 继承 Duplex，同时实现了 Readable 和 Writable

### 题 2
背压：下游写入速度跟不上上游读取速度时，数据堆积在内存缓冲区中的现象。

不处理的后果：内存不断增长，最终导致 OOM（Out of Memory）进程崩溃。

处理方式：`writable.write()` 返回 `false` 时暂停上游，等 `drain` 事件后恢复。`pipe` 自动处理。

### 题 3
```javascript
const { EventEmitter } = require('events');

class Logger extends EventEmitter {
  log(msg) {
    this.emit('log', { timestamp: new Date().toISOString(), msg });
  }
}

const logger = new Logger();
logger.on('log', ({ timestamp, msg }) => {
  console.log(`[${timestamp}] ${msg}`);
});

logger.log('Server started');
logger.log('Request received');
```

### 题 4
问题：每次 `setInterval` 触发都会注册一个新的 `data` 监听器，监听器数量无限增长，导致内存泄漏，并且每条 data 会被处理多次。

修复：监听器应该只注册一次：
```javascript
class MyService extends EventEmitter {
  start() {
    this.on('data', (d) => console.log(d)); // 只注册一次
    setInterval(() => {
      this.emit('data', 'some data'); // 定时触发
    }, 1000);
  }
}
```

### 题 5
不能用 `fs.readFile` 的原因：1GB 文件会将整个内容载入内存，而一般 Node.js 进程内存限制约 1.5GB，会 OOM。

正确方式：
```javascript
const fs = require('fs');
const readline = require('readline');

let errorCount = 0;
const rl = readline.createInterface({ input: fs.createReadStream('server.log') });
rl.on('line', (line) => {
  if (line.includes('ERROR')) errorCount++;
});
rl.on('close', () => console.log('ERROR 行数:', errorCount));
```
流式逐行读取，内存只保留一行，无论文件多大都能处理。
