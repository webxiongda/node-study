# Day 34 — BullMQ 消息队列：复习文档

## 核心知识点总结

### 消息队列三大价值

1. **异步解耦**：发送邮件不阻塞注册接口
2. **削峰填谷**：突发流量入队，按速率处理
3. **可靠重试**：失败后自动重试，持久化不丢失

### BullMQ 核心 API

```ts
// 生产者
await queue.add('job-name', data, options);
await queue.add('delayed', data, { delay: 60000 });
await queue.add('cron', data, { repeat: { cron: '0 8 * * *' } });

// 消费者
@Processor('queue-name')
class MyProcessor extends WorkerHost {
  async process(job: Job) { /* 处理逻辑 */ }
}

// 监控
const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
const failed = await queue.getFailed(0, 50);
await failedJob.retry();
```

### Job 生命周期

```
add() → waiting → active → completed
                         → failed（retry 后重回 waiting）
add(delay) → delayed → waiting → active → ...
```

## 易错点整理

1. **重复定时任务**：`repeat` 的 job 不要每次启动都 add，要先检查是否已存在
2. **JobId 唯一性**：延迟任务要设 `jobId`，否则会重复入队
3. **Worker 并发**：默认并发1，高吞吐场景要设 `concurrency`
4. **忘记注册 Processor**：`EmailProcessor` 需要在 Module 的 `providers` 中声明

## 高频面试题

**Q1：消息队列解决了什么问题？**  
异步解耦（服务间不直接调用）、削峰填谷（队列缓冲突发流量）、可靠投递（失败重试，持久化）。

**Q2：BullMQ 如何保证消息不丢失？**  
Job 持久化存在 Redis；Worker 处理时持有 lock；Worker 崩溃后 lock 超时，job 重新入队；结合 Redis AOF 持久化。

**Q3：BullMQ 和 Kafka 怎么选？**  
中小规模、已有 Redis → BullMQ（轻量、易用）；  
大规模流处理、需要消息回放、多消费者组 → Kafka。

**Q4：如何处理毒丸消息（poison pill）？**  
设置 `attempts` 上限，失败后进入 `failed` 状态；监听 `failed` 事件告警；定期清理或人工处理。

## 自测题（不看答案作答）

1. `attempts: 3` 表示最多执行几次（含第一次）？
2. 如何取消一个已入队但还未执行的延迟任务？
3. 如果 Worker 进程崩溃，正在处理的 job 会怎样？
4. 定时任务（cron repeat）需要注意什么问题？

## 下一章学习建议

Day 35 是缓存实战综合，把 Redis 缓存策略（Day 32-33）和 BullMQ（Day 34）整合到真实博客项目中，重点关注缓存和队列如何协同工作（如：文章更新后删缓存 + 通知关注者）。
