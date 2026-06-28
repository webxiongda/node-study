# Day 34 — BullMQ 消息队列：理论笔记

## 为什么需要消息队列？

**核心价值**：异步解耦 + 削峰填谷 + 失败重试

| 场景 | 同步问题 | 队列解决 |
|------|---------|---------|
| 用户注册发邮件 | 邮件服务慢导致注册接口超时 | 入队立即返回，异步发送 |
| 批量图片处理 | 同时处理太多导致 OOM | 队列限流，按速率处理 |
| 第三方 API 限速 | 并发超限被拒绝 | 队列排队，按配额发送 |
| 数据库批量写入 | 峰值写入压垮 DB | 队列缓冲，平稳写入 |

---

## BullMQ 核心概念 ★

```
Producer → Queue → Worker
           (Redis)
```

- **Queue**：任务队列，存储在 Redis 中
- **Job**：单个任务，包含 `name`（任务类型）和 `data`（任务数据）
- **Worker**：消费者，从队列取任务并执行
- **Processor**：Worker 内处理具体逻辑的函数

### Job 生命周期

```
待添加 → waiting → active（Worker 处理中）
                 → completed（成功）
                 → failed（失败，可重试）
                 → delayed（延迟执行）
```

---

## NestJS 集成（@nestjs/bullmq） ★

```bash
pnpm add @nestjs/bullmq bullmq ioredis
```

```ts
// app.module.ts
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
    }),
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'image-process' }),
  ],
})
export class AppModule {}
```

### Producer（生产者）

```ts
// src/auth/auth.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuthService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.createUser(dto);
    
    // 异步发送欢迎邮件（入队立即返回）
    await this.emailQueue.add('welcome', {
      to: user.email,
      name: user.name,
    });
    
    return user;
  }
}
```

### Consumer/Worker（消费者）

```ts
// src/email/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case 'welcome':
        await this.sendWelcomeEmail(job.data);
        break;
      case 'reset-password':
        await this.sendResetEmail(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async sendWelcomeEmail(data: { to: string; name: string }) {
    // 实际发送邮件逻辑
    console.log(`Sending welcome email to ${data.to}`);
  }
}
```

---

## 高级特性 ★

### 延迟任务（Delayed Jobs）

```ts
// 延迟1小时后执行
await queue.add('reminder', data, { delay: 60 * 60 * 1000 });
```

### 定时任务（Cron Jobs）

```ts
// 每天早上8点执行
await queue.add('daily-report', {}, {
  repeat: { cron: '0 8 * * *' },
});
```

### 重试策略

```ts
await queue.add('send-email', data, {
  attempts: 3,           // 最多重试3次
  backoff: {
    type: 'exponential', // 指数退避
    delay: 1000,         // 初始等待1秒
  },
});
```

### 并发控制

```ts
@Processor('image-process', { concurrency: 5 }) // 最多同时5个 job
export class ImageProcessor extends WorkerHost {}
```

---

## 面试高频问题

**Q：消息队列和直接异步函数的区别？**  
异步函数（Promise/async）：进程内异步，进程重启则丢失。  
消息队列：持久化到 Redis，即使服务重启 job 仍然存在，还支持重试、优先级、延迟等高级特性。

**Q：BullMQ 如何保证 at-least-once 语义？**  
Worker 处理完才从队列删除，处理中的 job 有 lock（心跳续期），Worker 宕机后 job 会重新入队被其他 Worker 处理。

**Q：如何监控队列健康？**  
`queue.getJobCounts()` 获取各状态 job 数量；  
BullMQ Board（UI）可视化监控；  
设置 `failed` 事件监听告警。

**Q：为什么用 Redis 而不是 RabbitMQ/Kafka？**  
Redis：轻量，已经在用 Redis 的项目无需额外组件，适合中小规模。  
Kafka：高吞吐、持久化、消费者组，适合大规模流处理。  
RabbitMQ：AMQP 协议，丰富路由，适合企业级消息路由场景。
