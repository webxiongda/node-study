# Day 06 — 项目任务：并发任务调度器

## 业务背景

你的系统需要批量处理数据（如图片压缩、数据迁移、邮件发送），需要一个通用的并发任务调度器，支持：限制并发数、任务优先级、进度上报、失败重试。

## 技术要求

使用 EventEmitter + Promise，不安装第三方包。

## API 设计

```javascript
const scheduler = new TaskScheduler({ concurrency: 5, retries: 2 });

// 添加任务
scheduler.add({
  name: 'compress-image-1',
  priority: 1,           // 数字越大优先级越高
  fn: async () => { /* 压缩逻辑 */ return 'result' },
});

// 监听事件
scheduler.on('start',    ({ name }) => console.log(`开始: ${name}`));
scheduler.on('complete', ({ name, result }) => console.log(`完成: ${name}`));
scheduler.on('error',    ({ name, error, attempt }) => console.warn(`失败: ${name}`));
scheduler.on('progress', ({ done, total, percent }) => console.log(`进度: ${percent}%`));
scheduler.on('drain',    () => console.log('所有任务完成'));

// 等待所有完成
await scheduler.waitForDrain();
console.log('统计:', scheduler.getStats());
// { total: 10, succeeded: 9, failed: 1, avgDuration: 234 }
```

## 验收标准

- [ ] 同时运行的任务数不超过 `concurrency`
- [ ] 高优先级任务先执行（优先级队列）
- [ ] 失败任务自动重试（最多 `retries` 次）
- [ ] 每完成一个任务触发 `progress` 事件
- [ ] 全部完成触发 `drain` 事件
- [ ] `getStats()` 返回正确统计数据
- [ ] `waitForDrain()` 返回一个在 drain 时 resolve 的 Promise

## 常见坑

1. **优先级队列**：不要用 `array.sort()` 每次插入都排序（O(n log n)），可以用简单的 `array.push + sort`（题目规模不大，没问题）或实现最小堆。
2. **并发槽管理**：用一个计数器 `running` 跟踪当前并发数，每次任务完成后检查队列并启动新任务。
3. **waitForDrain 实现**：`new Promise(resolve => this.once('drain', resolve))`，注意如果队列已经空了调用 waitForDrain 要立即 resolve。
