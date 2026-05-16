# Day 34 — BullMQ 消息队列：验收自测

## 题 1：概念题

BullMQ 中 Queue、Job、Worker、Processor 分别是什么？描述一个任务从生产到消费的完整流程。

## 题 2：选择题

以下哪种场景**不适合**使用消息队列？

A. 用户注册后发送欢迎邮件  
B. 用户查询自己的个人信息（需要实时返回）  
C. 批量处理上传的图片（压缩+生成缩略图）  
D. 每天定时生成数据统计报表

## 题 3：代码题

下面的代码中，`attempts: 3` 和 `backoff` 分别有什么作用？如果 job 失败了3次，会发生什么？

```ts
await queue.add('send-email', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

## 题 4：业务场景

你在做一个电商平台，用户下单后需要：
1. 给用户发送订单确认邮件
2. 通知仓库备货
3. 30分钟后如果未支付，自动取消订单

请设计如何用 BullMQ 实现，说明需要几个队列、什么 Job 名称、是否需要延迟任务。

## 参考答案

**题 1**：  
Queue：任务队列，存在 Redis 中，生产者往里放，消费者从里取。  
Job：单个任务，有 name（类型）、data（数据）、状态。  
Worker：消费者服务，监听队列，取出 job 交给 Processor 处理。  
Processor：Worker 里的处理函数，包含实际业务逻辑。  
流程：Producer 调用 `queue.add()` → job 进入 waiting 状态 → Worker 拉取 → 进入 active 状态 → Processor 执行 → completed / failed

**题 2**：B（实时查询必须同步返回，不能异步）

**题 3**：  
`attempts: 3`：失败后最多重试3次（共执行4次：1次原始+3次重试）。  
`backoff.type: 'exponential'`：指数退避，每次重试等待时间翻倍（1s → 2s → 4s）。  
3次都失败后：job 进入 `failed` 状态，可手动 retry 或告警处理。

**题 4**：  
建议：2个队列（`order-notifications`、`order-tasks`）  
- `order-notifications.add('order-confirmed', { email, orderId })`：普通 job，立即发邮件
- `order-notifications.add('warehouse-notify', { orderId, items })`：通知仓库
- `order-tasks.add('auto-cancel', { orderId }, { delay: 30 * 60 * 1000, jobId: order:${orderId} })`：延迟30分钟取消
- 用户支付成功后调用 `job.remove()` 取消自动取消任务
