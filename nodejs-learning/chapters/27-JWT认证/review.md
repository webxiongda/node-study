# Day 27 — JWT 认证：复习文档

## 核心知识点

| 概念 | 要点 |
|------|------|
| JWT 结构 | Header.Payload.Signature，Payload 只 Base64，非加密 |
| Access Token | 短期（15min），每次请求带 Authorization header |
| Refresh Token | 长期（7d），存 httpOnly Cookie，只用于续期 |
| 密码存储 | bcrypt hash，不可逆，cost=10 |
| Token 吊销 | tokenVersion / Redis 黑名单 / 短 AT + RT 失效 |

## 高频面试题

**Q1：JWT 的 Payload 是加密的吗？**
不是，只是 Base64 编码，任何人都能解码读取内容。所以不能在 Payload 里存密码、信用卡号等敏感信息，只存 userId、roles 等非敏感身份信息。

**Q2：为什么要区分 Access Token 和 Refresh Token？**
AT 短期有效，减少 token 泄露的风险窗口；RT 长期有效，用于续期，存在更安全的地方（httpOnly Cookie）。如果 AT 泄露，最多失效几分钟；如果 RT 泄露，可以立即在服务端使其失效。

**Q3：如何实现 Token 黑名单（主动吊销）？**
登出时将 AT 存入 Redis，key = token，value = 1，TTL = AT 剩余有效期。每次验证 JWT 时先查 Redis，在黑名单里则拒绝。代价是每次验证多一次 Redis 查询。

**Q4：bcrypt 的 cost factor 是什么？设多少合适？**
控制哈希计算的迭代次数（`2^cost` 次），越大越安全但越慢。cost=10 在普通服务器上约 100ms，是安全和性能的平衡点。

## 自测题（不看答案）

1. 用 `alg: none` 攻击 JWT 是什么原理？如何防御？
2. 为什么登录失败时不应该区分「用户不存在」和「密码错误」？
3. Refresh Token 存 Cookie 时，`SameSite` 应该设什么？为什么？

## 下一章建议

Day 28：RBAC 权限控制——基于角色的访问控制，用 Reflector + Guard 实现，装饰器组合（@Public + @Roles），以及更细粒度的资源级权限（作者只能修改自己的文章）。
