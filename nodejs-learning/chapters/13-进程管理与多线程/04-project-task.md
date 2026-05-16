# Day 13 — 项目任务：Worker Threads 线程池

## 业务背景

你的 API 需要对上传的用户头像做缩略图处理（CPU 密集），但不能阻塞主线程处理其他请求。实现一个线程池，将图片处理任务分发到 Worker 线程。

## 技术要求

不安装第三方包，用 `worker_threads` + `crypto`（模拟图片处理）实现。

## 代码结构

```
worker-pool/
├── pool.js        — WorkerPool 类
├── worker.js      — Worker 线程逻辑
└── main.js        — 测试主程序
```

## API 设计

```javascript
// pool.js
class WorkerPool {
  constructor(workerPath, size = os.cpus().length)
  async run(data: unknown): Promise<unknown>
  async destroy(): Promise<void>  // 关闭所有 Worker
  getStats(): { idle: number, busy: number, queued: number }
}
```

## 验收标准

- [ ] 线程池大小等于 CPU 核数（默认）
- [ ] `run(data)` 返回 Promise，任务完成后 resolve
- [ ] 所有线程都忙时，新任务进入等待队列
- [ ] `destroy()` 优雅关闭所有 Worker（等待当前任务完成后才关闭）
- [ ] `getStats()` 返回当前空闲/繁忙/排队数量
- [ ] 测试：同时提交 20 个任务，线程数为 4，观察并发和排队行为

## 常见坑

1. **Worker 错误处理**：Worker 抛出未捕获异常时，`worker.on('error')` 触发。此时需要 reject 当前任务，并从池中移除该 Worker（或重新创建一个替换）。
2. **destroy 时处理排队中的任务**：销毁时，队列中还没开始的任务应该 reject（或等待它们也完成，取决于 graceful shutdown 语义）。
3. **重用 Worker**：Worker 处理完一个任务后，不要 terminate，而是继续等待下一个 `postMessage`。Worker 的 `message` 监听器要在每次任务完成后用 `once` 而不是 `on`（避免多次触发）。
