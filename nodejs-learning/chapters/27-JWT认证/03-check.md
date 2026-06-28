# Day 27 — JWT 认证：验收自测

## 题 1（概念）

JWT 的三个部分各是什么？Payload 是加密的吗？

## 题 2（安全题）

以下 JWT payload 有什么安全问题？

```json
{ "sub": 1, "email": "alice@example.com", "password": "hashed_pw", "creditCard": "4111..." }
```

## 题 3（代码题）

以下代码有什么问题？

```ts
async login(password: string, user: User) {
  if (password !== user.passwordHash) {
    throw new UnauthorizedException('密码错误');
  }
}
```

## 题 4（设计题）

用户反馈：「我在 A 设备登出后，B 设备的 Token 还能用。」如何设计 Token 失效机制？

## 题 5（业务场景）

如果 JWT_SECRET 被泄露了，应该怎么处理？

---

## 参考答案

**题 1**：Header（算法类型，Base64编码）/ Payload（用户数据，Base64编码）/ Signature（HMAC签名）。Payload 只是 Base64 编码，**不是加密**，任何人都能解码，不要存敏感信息。

**题 2**：Payload 不加密，`password` 和 `creditCard` 存在 JWT 里会直接暴露（Base64 可轻易解码）。JWT 只应存非敏感的身份信息（userId, email, roles）。

**题 3**：直接比较明文密码和 hash 值（`password !== user.passwordHash`）——永远不匹配。密码应该用 `await bcrypt.compare(password, user.passwordHash)`（异步，忘了 await 是第二个问题）。

**题 4**：
方案一（Token Version）：用户表加 `tokenVersion` 字段，JWT payload 带 `version`；登出时 `tokenVersion += 1`；验证时检查 payload.version 是否等于数据库值。
方案二（Redis 黑名单）：登出时把 Access Token 存入 Redis 黑名单（TTL = Token 剩余有效期）；每次验证时检查 Redis 是否存在该 Token。
方案三（短期 AT + RT 失效）：AT 保持 15 分钟有效，登出时使 RT 失效；损失最多 15 分钟的窗口期，但实现最简单。

**题 5**：
1. 立即更换 JWT_SECRET 环境变量（旧 secret 签发的所有 token 立即失效）
2. 通知所有用户重新登录
3. 排查 secret 泄露来源（日志、代码仓库、环境变量管理）
4. 检查是否有异常登录记录
5. 考虑强制重置所有用户密码（如果攻击者可能已冒充用户操作）
