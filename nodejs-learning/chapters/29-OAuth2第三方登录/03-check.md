# Day 29 — OAuth2 第三方登录：验收自测

## 题 1：OAuth2 流程

描述 Authorization Code 流程的 5 个步骤（不看笔记）。

## 题 2：安全题

为什么 OAuth2 的 Authorization Code 模式比 Implicit 模式更安全？

## 题 3：账号绑定

用户已有一个邮箱 `alice@gmail.com` 的账号，现在用 Google 登录，Google 返回的邮箱也是 `alice@gmail.com`。应该如何处理？

## 题 4：设计题

如果用户想解绑 GitHub，但账号没有密码（纯 OAuth 注册），应该怎么处理？

---

## 参考答案

**题 1**：
1. 用户点击登录 → 重定向到 GitHub 授权页（带 client_id, redirect_uri, scope, state）
2. 用户在 GitHub 授权 → GitHub 重定向回 callback URL（带 code, state）
3. 服务端验证 state → 用 code 换 access_token（POST 请求，带 client_secret）
4. 服务端用 access_token 调 GitHub API 获取用户信息
5. 本地查找/创建用户，签发自己的 JWT，返回给前端

**题 2**：
Implicit 直接把 access_token 放在 URL fragment（`#access_token=...`），暴露在浏览器历史、Referer header、服务器日志里。Authorization Code 先返回短期一次性的 code，code 在服务端换 token，token 不经过浏览器，更安全。

**题 3**：
邮箱匹配策略（自动绑定）：查找邮箱 `alice@gmail.com` 对应的已有账号，更新其 `oauthProvider` 和 `oauthId` 字段，完成绑定，然后正常登录。用户体验最好，但需要信任 OAuth 提供商的邮箱验证。

**题 4**：
强制用户先设置密码（邮箱/密码），才能解绑 OAuth 账号。否则解绑后用户无法再登录自己的账号。流程：`POST /auth/set-password`（验证已登录）→ 设置密码 → 才能 `POST /auth/disconnect/github`。
