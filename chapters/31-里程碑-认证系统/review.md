# Day 31 — 里程碑：认证系统复习

## 核心面试题汇总

1. JWT 三部分是什么？Payload 加密吗？
2. Access Token 和 Refresh Token 各存在哪？为什么？
3. 如何主动吊销 JWT？
4. bcrypt 的 cost factor 是什么？设多少合适？
5. RBAC 中 Guard 和 Service Owner Check 各负责什么？
6. CSRF 攻击原理，Bearer Token 为什么免疫？
7. XSS 三种类型和防御？
8. Prisma 如何防 SQL 注入？
9. OAuth2 Authorization Code 流程 5 步？
10. SameSite=Strict 和 Lax 的区别？

## 下一阶段预告

**Day 32-35：Redis 缓存与消息队列**
- Redis 基础：String/Hash/List/Set/ZSet
- NestJS 缓存：`@nestjs/cache-manager` + Redis
- 缓存策略：Cache-aside、穿透/击穿/雪崩
- BullMQ：任务队列，邮件发送、图片处理
