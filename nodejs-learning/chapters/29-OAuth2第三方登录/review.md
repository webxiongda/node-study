# Day 29 — OAuth2 第三方登录：复习文档

## 核心知识点

**OAuth2 Authorization Code 流程**（5步）：
重定向到授权页 → 用户授权 → 返回 code → 换 token → 获取用户信息

**四种角色**：Resource Owner（用户）/ Client（我们的应用）/ Authorization Server（GitHub）/ Resource Server（GitHub API）

## 高频面试题

**Q：OAuth2 和 OpenID Connect 的区别？**
OAuth2 是授权协议（让应用访问资源）；OpenID Connect 是在 OAuth2 基础上增加身份认证层，返回 ID Token（JWT）告诉应用「用户是谁」。

**Q：state 参数的作用？**
防 CSRF 攻击。服务端生成随机 state，放在重定向 URL 里；回调时验证 state 是否和发出去的一致，防止攻击者伪造回调请求。

## 自测题（不看答案）

1. PKCE 解决了什么问题？code_verifier 和 code_challenge 是什么？
2. Refresh Token 在 OAuth2 里和 JWT 的 Refresh Token 有什么区别？
3. 如果用户撤销了 GitHub 的授权，我们应用的 OAuth access_token 还有效吗？

## 下一章建议

Day 30：Web 安全——XSS/CSRF/SQL 注入/SSRF 原理和防御，NestJS 里的 helmet/CORS/rate-limiting 配置，这些是全栈面试的安全类必考题。
