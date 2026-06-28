# Day 34 — BullMQ 消息队列：实操 Demo

## Demo 1：注册发送欢迎邮件

```bash
pnpm add @nestjs/bullmq bullmq
```

```ts
// src/email/email.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'email' })],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class EmailModule {}

// src/email/email.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private logger = new Logger(EmailProcessor.name);

  async process(job: Job) {
    this.logger.log(`Processing job ${job.id} [${job.name}]`);
    
    switch (job.name) {
      case 'welcome':
        await this.sendWelcome(job.data);
        break;
      case 'reset-password':
        await this.sendResetPassword(job.data);
        break;
    }
  }

  private async sendWelcome(data: { to: string; name: string }) {
    // 模拟发邮件（实际用 nodemailer 或 SendGrid）
    await new Promise(r => setTimeout(r, 500));
    this.logger.log(`Welcome email sent to ${data.to}`);
  }

  private async sendResetPassword(data: { to: string; token: string }) {
    await new Promise(r => setTimeout(r, 300));
    this.logger.log(`Reset email sent to ${data.to}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}

// src/auth/auth.service.ts（注册时入队）
@Injectable()
export class AuthService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: await bcrypt.hash(dto.password, 10) },
    });
    
    await this.emailQueue.add('welcome', {
      to: user.email,
      name: user.name ?? 'User',
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    
    return { message: 'Registration successful, welcome email queued' };
  }
}
```

---

## Demo 2：延迟任务 + 定时任务

```ts
// src/notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  // 延迟30分钟发送「未完成操作」提醒
  async scheduleAbandonedCartReminder(userId: number) {
    await this.queue.add('abandoned-cart', { userId }, {
      delay: 30 * 60 * 1000,
      jobId: `cart:${userId}`, // 唯一 jobId，防止重复添加
    });
  }

  // 每天早上9点发送日报
  async setupDailyReport() {
    await this.queue.add('daily-report', {}, {
      repeat: { cron: '0 9 * * *' },
    });
  }
  
  // 取消延迟任务（用户完成了操作）
  async cancelReminder(userId: number) {
    const job = await this.queue.getJob(`cart:${userId}`);
    if (job) await job.remove();
  }
}
```

---

## Demo 3：队列监控

```ts
// src/admin/queue-stats.controller.ts
@Controller('admin/queue')
export class QueueStatsController {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  @Get('stats')
  async getStats() {
    const counts = await this.emailQueue.getJobCounts(
      'waiting', 'active', 'completed', 'failed', 'delayed'
    );
    return counts;
  }

  @Delete('failed')
  async clearFailed() {
    await this.emailQueue.clean(0, 100, 'failed');
    return { message: 'Cleared failed jobs' };
  }

  @Post('retry-failed')
  async retryFailed() {
    const failedJobs = await this.emailQueue.getFailed(0, 50);
    await Promise.all(failedJobs.map(job => job.retry()));
    return { retried: failedJobs.length };
  }
}
```

**验证**：
```bash
# 查看队列状态
curl http://localhost:3000/admin/queue/stats
# 返回: { "waiting": 0, "active": 1, "completed": 5, "failed": 0, "delayed": 2 }

# 注册触发邮件入队
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"pass123"}'
# 控制台应该看到 Worker 处理日志
```
