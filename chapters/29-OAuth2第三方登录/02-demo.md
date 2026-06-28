# Day 29 — OAuth2 第三方登录：实操 Demo

## Demo：GitHub OAuth2 完整流程

### 1. GitHub App 配置

```
GitHub Settings → Developer Settings → OAuth Apps → New OAuth App
Application name: Blog API Dev
Homepage URL: http://localhost:3000
Callback URL: http://localhost:3000/auth/github/callback
```

记下 Client ID 和 Client Secret，写入 `.env`：
```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
FRONTEND_URL=http://localhost:4200
```

### 2. Prisma Schema 更新

```prisma
model User {
  // 新增字段
  oauthProvider  String?  @map("oauth_provider")
  oauthId        String?  @map("oauth_id")
  avatar         String?
  passwordHash   String?  @map("password_hash")  // OAuth 用户可为 null

  @@unique([oauthProvider, oauthId])
}
```

```bash
npx prisma migrate dev --name add-oauth-fields
```

### 3. 测试流程

```bash
pnpm start:dev

# 浏览器访问（会重定向到 GitHub）
open http://localhost:3000/auth/github

# GitHub 授权后回调
# 会重定向到 http://localhost:4200/auth/callback?token=eyJ...

# 解码 Token 验证
echo "eyJ..." | base64 -d | python3 -m json.tool
```

### 4. 前端接入示意

```html
<!-- 登录按钮 -->
<a href="http://localhost:3000/auth/github">使用 GitHub 登录</a>

<!-- 回调页面 (auth/callback.html) -->
<script>
  const token = new URLSearchParams(location.search).get('token');
  localStorage.setItem('access_token', token);
  location.href = '/dashboard';
</script>
```
