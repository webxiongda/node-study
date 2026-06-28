# Day 04 — EventEmitter / Stream / Buffer · 理论文档

## 核心概念

### 1. EventEmitter — 事件驱动的基础

Node.js 中几乎所有的异步对象都继承自 `EventEmitter`（HTTP Server、Stream、进程、Socket…）。

```javascript
const { EventEmitter } = require('events');

const emitter = new EventEmitter();

// 监听事件
emitter.on('data', (payload) => console.log('received:', payload));
emitter.once('connect', () => console.log('connected once'));  // 只触发一次

// 触发事件
emitter.emit('data', { id: 1, name: 'Alice' });
emitter.emit('connect');
emitter.emit('connect'); // 不再触发（once 已移除监听器）

// 移除监听器
const handler = (msg) => console.log(msg);
emitter.on('message', handler);
emitter.off('message', handler);  // 等价于 removeListener

// 查看监听器
emitter.listenerCount('data');    // 当前监听器数量
emitter.eventNames();             // 所有已监听的事件名
```

**继承 EventEmitter：**
```javascript
class TaskRunner extends EventEmitter {
  run(tasks) {
    this.emit('start', tasks.length);
    tasks.forEach((task, i) => {
      task();
      this.emit('progress', i + 1, tasks.length);
    });
    this.emit('done');
  }
}

const runner = new TaskRunner();
runner.on('progress', (done, total) => console.log(`${done}/${total}`));
runner.run([() => {}, () => {}, () => {}]);
```

**内存泄漏警告（面试考点）：**
- 默认最大监听器数为 10，超过会警告
- 用 `emitter.setMaxListeners(n)` 或 `emitter.setMaxListeners(0)` 关闭警告
- 忘记移除 `on` 监听器是最常见的内存泄漏来源

---

### 2. Buffer — 二进制数据

JavaScript 没有二进制类型，Buffer 是 Node.js 提供的固定大小的内存块，用于处理 TCP 数据、文件字节、加密等。

```javascript
// 创建 Buffer
Buffer.from('Hello')              // 从字符串（默认 UTF-8）
Buffer.from('Hello', 'base64')    // 从 Base64
Buffer.from([0x48, 0x65, 0x6c])   // 从字节数组
Buffer.alloc(10)                  // 分配 10 字节（零初始化）
Buffer.allocUnsafe(10)            // 更快但不清零（有安全风险）

// Buffer 转字符串
buf.toString()               // UTF-8
buf.toString('base64')       // Base64
buf.toString('hex')          // 十六进制

// Buffer 操作
Buffer.concat([buf1, buf2])  // 合并
buf.slice(0, 5)              // 截取（返回视图，不复制）
buf.length                   // 字节数（不是字符数！）
```

**Buffer vs ArrayBuffer**：Buffer 是 Node.js 专有的（基于 `Uint8Array`），`ArrayBuffer` 是 Web 标准。在 Node.js 中通常用 Buffer，现代 API 中两者可互转。

---

### 3. Stream — 流式处理（重要）

流的核心价值：**不需要把数据全部载入内存，而是分块处理**。

**四种流类型：**

| 类型 | 描述 | 例子 |
|------|------|------|
| Readable | 可读流 | `fs.createReadStream`、`process.stdin`、HTTP 请求体 |
| Writable | 可写流 | `fs.createWriteStream`、`process.stdout`、HTTP 响应 |
| Duplex | 读写都行 | TCP Socket |
| Transform | 读入数据、转换后输出 | `zlib.createGzip()`、加密流 |

**pipe — 连接流（最常用模式）：**
```javascript
const fs = require('fs');
const zlib = require('zlib');

// 读文件 → 压缩 → 写文件
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'));
```

**手动消费 Readable 流：**
```javascript
const readable = fs.createReadStream('big-file.txt', { encoding: 'utf8' });

// 方式1：on('data')
readable.on('data', chunk => process.stdout.write(chunk));
readable.on('end', () => console.log('done'));
readable.on('error', err => console.error(err));

// 方式2：for await（推荐，Node.js 10+）
for await (const chunk of readable) {
  process.stdout.write(chunk);
}
```

**自定义 Transform 流（面试偶考）：**
```javascript
const { Transform } = require('stream');

class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

process.stdin.pipe(new UpperCaseTransform()).pipe(process.stdout);
```

**背压（Backpressure）— 面试高频：**
当写入速度跟不上读取速度时，需要暂停读取：
```javascript
readable.on('data', chunk => {
  const ok = writable.write(chunk);
  if (!ok) {
    readable.pause();  // 暂停读取
    writable.once('drain', () => readable.resume()); // 排空后恢复
  }
});
```
`pipe` 会自动处理背压，所以推荐用 `pipe`。

---

## 面试高频问题

**Q1: EventEmitter 的内存泄漏如何排查？**

答：使用 `emitter.listenerCount('eventName')` 检查监听器数量；确保每个 `on` 都有对应的 `off`；对一次性操作用 `once`。Node.js 会在监听器超过 10 个时打印警告。

**Q2: Stream 的背压是什么？为什么重要？**

答：背压（Backpressure）是指下游消费速度跟不上上游生产速度时的反向压力机制。如果不处理背压，数据会堆积在内存中导致 OOM。`writable.write()` 返回 `false` 时表示缓冲区满，应暂停上游；等 `drain` 事件后再继续。`pipe` 自动处理此机制。

**Q3: 为什么用 Stream 读大文件而不是 `readFile`？**

答：`fs.readFile` 将整个文件读入内存，4GB 文件就占 4GB 内存。`createReadStream` 每次只读入固定大小的 chunk（默认 64KB），无论文件多大内存占用都是固定的。

**Q4: Buffer 的 `alloc` 和 `allocUnsafe` 区别？**

答：`alloc` 分配后用 0 填充（安全，但慢）；`allocUnsafe` 不清零，可能包含旧内存数据（快，但如果直接发送给用户可能泄露信息）。一般内部处理用 `allocUnsafe`，涉及用户数据用 `alloc`。
