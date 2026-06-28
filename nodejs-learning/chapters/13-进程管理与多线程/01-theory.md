# Day 13 — 进程管理与 Worker Threads · 理论文档

> ⭐⭐⭐ 面试高频：Node.js 如何处理 CPU 密集型任务

## 核心概念

### 1. 四种多进程/多线程方式对比

| 方式 | 隔离级别 | 通信方式 | 适用场景 |
|------|---------|---------|---------|
| `child_process.exec` | 独立进程 | stdout 字符串 | 执行 shell 命令、外部程序 |
| `child_process.spawn` | 独立进程 | 流 | 持续输出的命令（如 ffmpeg）|
| `child_process.fork` | 独立进程 | IPC 消息 | 运行 Node.js 子进程，双向通信 |
| `worker_threads` | 同进程 | SharedArrayBuffer/postMessage | CPU 密集型 JS 任务 |
| `cluster` | 独立进程 | 共享监听端口 | HTTP 服务多核扩展 |

---

### 2. child_process — 子进程

```javascript
const { exec, spawn, fork } = require('child_process');

// exec：执行命令，获取字符串输出（有缓冲区限制）
exec('ls -la', (err, stdout, stderr) => {
  if (err) return console.error(err);
  console.log(stdout);
});

// spawn：流式输出，无缓冲区限制
const ls = spawn('ls', ['-la', '/']);
ls.stdout.on('data', data => process.stdout.write(data));
ls.on('close', code => console.log('exit code:', code));

// fork：运行 Node.js 子脚本，支持 IPC 消息传递
const child = fork('./worker.js');
child.send({ task: 'compute', data: largeArray });
child.on('message', result => {
  console.log('结果:', result);
  child.kill();
});
```

---

### 3. worker_threads — 工作线程（⭐ 重要）

**适合场景：** CPU 密集型 JS 计算（crypto、数据处理、图片转换）

```javascript
// main.js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
  // 主线程
  const worker = new Worker(__filename, {
    workerData: { numbers: [1, 2, 3, 4, 5] }
  });
  
  worker.on('message', result => console.log('结果:', result));
  worker.on('error', err => console.error('Worker 错误:', err));
  worker.on('exit', code => console.log('Worker 退出:', code));
} else {
  // Worker 线程（同一个文件，通过 isMainThread 区分）
  const { numbers } = workerData;
  const sum = numbers.reduce((a, b) => a + b, 0);
  parentPort.postMessage(sum);
}
```

**线程池模式（生产中常用）：**
```javascript
class WorkerPool {
  constructor(workerPath, size = 4) {
    this.workers = Array.from({ length: size }, () => ({
      worker: new Worker(workerPath),
      busy: false
    }));
    this.queue = [];
  }
  
  run(data) {
    return new Promise((resolve, reject) => {
      const idle = this.workers.find(w => !w.busy);
      if (idle) {
        this._assign(idle, data, resolve, reject);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }
  
  _assign(slot, data, resolve, reject) {
    slot.busy = true;
    slot.worker.once('message', result => {
      slot.busy = false;
      resolve(result);
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this._assign(slot, next.data, next.resolve, next.reject);
      }
    });
    slot.worker.once('error', err => { slot.busy = false; reject(err); });
    slot.worker.postMessage(data);
  }
}
```

---

### 4. cluster — 多进程 HTTP 服务

```javascript
const cluster = require('cluster');
const os = require('os');
const http = require('http');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`主进程 ${process.pid}，启动 ${numCPUs} 个 Worker`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // Worker 崩溃时自动重启
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} 退出，重启...`);
    cluster.fork();
  });
} else {
  // 每个 Worker 进程独立运行 HTTP 服务器
  http.createServer((req, res) => {
    res.end(`Hello from Worker ${process.pid}`);
  }).listen(3000);
  
  console.log(`Worker ${process.pid} 启动`);
}
```

**cluster 的工作原理：**
- 主进程监听端口，接受连接
- 用轮询（Round-robin，Linux 默认）分发到 Worker 进程
- 每个 Worker 是独立的 Node.js 进程（各自的内存、事件循环）

---

## 面试高频问题

**Q1: Node.js 如何利用多核 CPU？**

答：两种方式：
1. `cluster` 模块：fork 多个进程，每个进程监听同一端口，主进程负责分发连接。适合 HTTP 服务扩展。
2. `worker_threads`：在同一进程内创建线程，共享内存（`SharedArrayBuffer`），适合 CPU 密集型计算。

生产中通常用 **PM2**（`pm2 start app.js -i max`）自动管理 cluster 进程数。

**Q2: worker_threads 和 child_process 的区别？**

答：
- `child_process.fork`：独立的 Node.js 进程，有独立内存，通信通过序列化的 IPC 消息（慢，但隔离）
- `worker_threads`：同进程内的线程，可以共享内存（`SharedArrayBuffer`），通信更快，但一个 Worker 崩溃可能影响主进程

**Q3: 什么时候用 cluster，什么时候用 worker_threads？**

答：
- `cluster`：HTTP 服务需要利用多核（最常见场景）
- `worker_threads`：处理单个耗时 JS 计算（如加密、数据分析），不想阻塞主线程

**Q4: child_process.exec 和 spawn 的区别？**

答：`exec` 缓冲所有输出后一次性回调（有默认 200KB 缓冲区限制）；`spawn` 是流式的，适合输出很大的命令（如 `git log` 大仓库）。
