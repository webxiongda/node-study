# Day 13 — 实操 Demo

## Demo 1：worker_threads 处理 CPU 密集型任务

```javascript
// fib-worker.js（Worker 线程文件）
const { parentPort, workerData } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(workerData.n);
parentPort.postMessage(result);

// main.js
const { Worker } = require('worker_threads');
const path = require('path');

function computeFib(n) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'fib-worker.js'), {
      workerData: { n }
    });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// 对比：阻塞 vs 非阻塞
console.log('开始计算...');

// 同步会阻塞主线程
// const result = fibonacci(44); // ~3s，期间无法处理任何请求

// Worker 不阻塞主线程
computeFib(44).then(result => {
  console.log('fib(44) =', result);
});

// 主线程继续正常响应
setInterval(() => process.stdout.write('主线程正常运行 '), 500);
```

---

## Demo 2：cluster 多核 HTTP 服务

```javascript
// cluster-server.js
const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  console.log(`启动 ${cpus} 个 Worker 进程（主进程: ${process.pid}）`);
  
  for (let i = 0; i < cpus; i++) cluster.fork();
  
  cluster.on('exit', (w) => {
    console.log(`Worker ${w.process.pid} 退出，重启...`);
    cluster.fork();
  });
  
  // 每5秒打印存活 Worker 数
  setInterval(() => {
    console.log('存活 Workers:', Object.keys(cluster.workers).length);
  }, 5000);
} else {
  http.createServer((req, res) => {
    // 模拟一点工作
    let sum = 0;
    for (let i = 0; i < 1e5; i++) sum += i;
    res.end(`Worker ${process.pid}: sum=${sum}`);
  }).listen(3000);
  
  console.log(`Worker ${process.pid} 监听 :3000`);
}
```

**测试：**
```bash
node cluster-server.js
# 另一个终端：
for i in $(seq 1 8); do curl http://localhost:3000 &; done
# 可以看到不同的 Worker PID 处理请求
```
