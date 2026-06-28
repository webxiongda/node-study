# Day 29 — 项目任务：接入 GitHub OAuth2

## 任务

1. 在 GitHub 创建 OAuth App，获取 Client ID 和 Secret
2. 实现 `GET /auth/github` 和 `GET /auth/github/callback` 接口
3. Strategy 里实现账号查找/绑定/创建逻辑
4. 测试：浏览器访问 `/auth/github`，完成授权，验证本地 JWT 有效

## 验收

```bash
# 访问 GitHub 登录页
open http://localhost:3000/auth/github

# 授权后能拿到 JWT，用 JWT 访问 /auth/profile 返回正确用户信息
# 多次 GitHub 登录，数据库里只有一条用户记录（不重复创建）
```

## 常见坑

1. Callback URL 大小写/斜杠必须和 GitHub OAuth App 配置完全一致
2. `scope: ['user:email']` 必须包含，否则拿不到邮箱
3. OAuth 用户 `passwordHash` 字段允许 null，需要更新 Prisma schema
4. 本地开发 Callback URL 用 `http://localhost:3000`，不是 `https`
