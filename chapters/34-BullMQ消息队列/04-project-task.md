# Day 34 — 项目任务：博客平台异步通知系统

## 任务

为博客 API 添加 BullMQ 异步通知功能：

1. 用户注册后异步发送欢迎邮件（模拟，console.log 即可）
2. 文章发布后通知所有关注者（模拟，打印关注者列表）
3. 支持失败重试（3次，指数退避）
4. 实现 `GET /admin/queue/stats` 接口查看队列状态

## 验收

```bash
# 注册用户，观察控制台
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"pass123","name":"Test"}'
# 控制台应该看到：[EmailProcessor] Welcome email sent to test@example.com

# 查看队列状态
curl http://localhost:3000/admin/queue/stats
# 返回: { waiting: 0, active: 0, completed: 1, failed: 0 }

# 测试失败重试（在 Processor 里临时抛出错误）
# 控制台应该看到 3 次重试日志，最后进入 failed 状态
```
