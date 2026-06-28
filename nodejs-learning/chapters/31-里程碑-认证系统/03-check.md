# Day 31 — 里程碑：认证系统综合测验

> 不看笔记，回答以下问题。这些是面试必考题。

## 1. 设计题（5分钟）

设计一个支持以下需求的认证系统：
- 邮箱/密码登录
- 记住我（30天）/ 不记住我（24小时）
- 多设备登出（登出所有设备）
- 密码修改后所有旧 Token 失效

## 2. 代码审查

找出以下认证代码的所有安全问题：

```ts
async login(email: string, password: string) {
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundException('用户不存在');  // 问题1
  if (user.password !== password) throw new UnauthorizedException('密码错误');  // 问题2
  const token = jwt.sign({ userId: user.id }, 'secret123');  // 问题3
  return { token };
}
```

## 3. 问答

Q：如果用户的 Refresh Token 被盗，攻击者能做什么？如何降低风险？

---

## 参考答案

**题 1 设计**：
- 「记住我」= RT 有效期 30天（否则 24 小时）
- 每次登录创建一条 `sessions` 记录（deviceId, token_hash, expires_at）
- 「登出所有设备」= 删除用户所有 sessions 记录
- 密码修改 = 在用户表加 `passwordChangedAt` 字段；JWT payload 里带 `iat`；验证时检查 `iat < passwordChangedAt` 则拒绝

**题 2**：
- 问题1：区分「用户不存在」和「密码错误」（防枚举攻击），统一返回「邮箱或密码错误」
- 问题2：直接比较明文密码（应该用 `bcrypt.compare(password, user.passwordHash)`）
- 问题3：secret 硬编码（应从 env 读取），没有设置过期时间（应加 `expiresIn`）

**题 3**：
攻击者用盗取的 RT 可以持续获取新 AT，直到 RT 过期（7天）或用户主动登出。

降低风险：
- RT 旋转（Refresh Token Rotation）：每次续期后签发新 RT，旧 RT 立即失效
- 检测重用：如果旧 RT 被再次使用，说明 RT 已被盗，强制用户登出所有设备
- RT 绑定设备指纹（User-Agent + IP）
- 缩短 AT 有效期（极端情况用 5 分钟）
