# Day 30 — Web 安全：复习文档

## 核心知识点

| 攻击 | 原理 | 防御 |
|------|------|------|
| XSS | 注入脚本在用户浏览器执行 | 框架转义 + CSP + sanitize-html + httpOnly Cookie |
| CSRF | 浏览器自动携带 Cookie 发请求 | SameSite Cookie + CSRF Token + 用 Authorization header |
| SQL 注入 | 用户输入拼接进 SQL | 参数化查询（ORM/Prepared Statement）|
| SSRF | 控制服务端发起内网请求 | URL 白名单 + 内网地址过滤 |

## 高频面试题

**Q1：XSS 和 CSRF 的核心区别？**
XSS 是「在目标用户浏览器上执行代码」；CSRF 是「借用目标用户的 Cookie/身份发起请求」，不需要执行代码。

**Q2：为什么 httpOnly Cookie 能防 XSS 但不能防 CSRF？**
httpOnly 让 JS 无法读取 Cookie（防 XSS 窃取）；但 CSRF 攻击不读取 Cookie，只是让浏览器自动发送——httpOnly Cookie 仍然会被自动携带。

**Q3：Helmet 做了什么？**
设置一系列安全 HTTP 响应头：CSP（内容安全策略）、X-Frame-Options（防点击劫持）、X-Content-Type-Options（防 MIME 嗅探）、HSTS（强制 HTTPS）等。

## 阶段三总结（Day 27-30 认证安全）

| Day | 主题 | 核心 |
|-----|------|------|
| 27 | JWT 认证 | AT+RT / bcrypt / Token 吊销 |
| 28 | RBAC | Guard + Reflector / Owner Check |
| 29 | OAuth2 | Authorization Code 流程 / PKCE |
| 30 | Web 安全 | XSS/CSRF/SQL注入 / Helmet / 限流 |

## 下一阶段预告

**Day 31-35：Redis 缓存**
- Redis 基础命令
- 缓存策略（穿透/击穿/雪崩）
- Session 存储
- BullMQ 消息队列
