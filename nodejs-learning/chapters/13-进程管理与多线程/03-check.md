# Day 13 — 验收自测题

---

### 题 1（概念题）
worker_threads 和 child_process.fork 的主要区别是什么？分别适合什么场景？

---

### 题 2（概念题）
cluster 模块是如何实现多进程共享同一端口的？

---

### 题 3（实操题）
以下场景选择哪种多进程/多线程方式？说明理由：

a) Node.js API 服务器，需要充分利用 4 核 CPU  
b) 需要执行 `git clone` 命令  
c) 需要将一个 10万行数组排序，排序过程不能阻塞 HTTP 请求处理  
d) 需要运行另一个 Node.js 脚本，并且需要双向通信  

---

### 题 4（实操题）
写一个使用 worker_threads 的函数 `hashPasswords(passwords: string[]): Promise<string[]>`，对密码数组并行哈希（用 `crypto.createHash('sha256')`），不阻塞主线程：

---

### 题 5（项目应用题）
一个 Node.js API 服务器每秒有 100 个请求，其中 10 个需要执行耗时 200ms 的 CPU 计算（报表生成）。你会如何设计？

---

## 参考答案

### 题 1
**worker_threads**：
- 同进程内的线程，共享进程内存（可用 `SharedArrayBuffer`）
- 适合：CPU 密集型 JS 计算（不要 I/O 的纯计算）
- 线程崩溃可能影响主进程

**child_process.fork**：
- 完全独立的 Node.js 进程，有独立内存
- 适合：运行另一个 Node.js 脚本，隔离性更强
- 通信通过 IPC（序列化，比共享内存慢）

### 题 2
主进程（Primary）监听端口，建立 TCP 连接。然后通过以下方式分发到 Worker：
- Linux：轮询（Round-robin），主进程把 socket 句柄传给 Worker 进程
- Windows：Worker 都监听同一端口，由 OS 分发

所有 Worker 共享同一个监听套接字（socket handle），但各自在独立进程中运行，有独立的事件循环和内存。

### 题 3
a) **cluster** — HTTP 服务多核扩展，4 个 Worker 进程各自处理请求
b) **child_process.exec/spawn** — 执行外部命令用 exec/spawn
c) **worker_threads** — 同进程 CPU 密集型计算，不阻塞主线程的事件循环
d) **child_process.fork** — 运行 Node.js 子进程，fork 支持 IPC 双向通信

### 题 4
```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const path = require('path');

if (!isMainThread) {
  // Worker 线程：哈希一个密码
  const hash = crypto.createHash('sha256').update(workerData.password).digest('hex');
  parentPort.postMessage(hash);
} else {
  function hashPasswords(passwords) {
    return Promise.all(passwords.map(password => 
      new Promise((resolve, reject) => {
        const w = new Worker(__filename, { workerData: { password } });
        w.once('message', resolve);
        w.once('error', reject);
      })
    ));
  }
  
  hashPasswords(['abc', '123', 'password']).then(console.log);
}
```

### 题 5
设计方案：
1. **cluster**：启动 N（CPU 核数）个 Worker 进程处理 HTTP 请求，分摊 100 req/s
2. **worker_threads 线程池**：每个 Worker 进程内维护一个小型线程池（2-4 线程），CPU 计算任务提交给线程池执行
3. 限流：对报表生成接口加限流（`429`），防止 CPU 计算积压

这样：普通请求在主线程处理（事件循环），CPU 计算在 Worker 线程处理，不互相干扰。
