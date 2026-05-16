# Day 27 — 项目任务：博客 API 接入 JWT 认证

## 任务：实现完整认证系统

### 接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /auth/register | 注册 | 公开 |
| POST | /auth/login | 登录 | 公开 |
| POST | /auth/refresh | 续期 AT | 需要 RT Cookie |
| POST | /auth/logout | 登出 | 需要 AT |
| GET | /auth/profile | 获取当前用户 | 需要 AT |

### 安全要求

- 密码用 bcrypt 存储（cost factor = 10）
- AT 有效期 15 分钟，RT 有效期 7 天
- RT 存 httpOnly Cookie
- 登出时使 RT 失效（数据库层面）
- 错误信息不能区分「用户不存在」和「密码错误」（防枚举攻击）

### 验收

```bash
# 注册
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"new@example.com","password":"password123","name":"新用户"}'

# 登录
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"new@example.com","password":"password123"}' \
  -c cookies.txt

# 访问受保护接口（无 Token）→ 401
curl http://localhost:3000/posts -X POST \
  -H 'Content-Type: application/json' \
  -d '{"title":"test","content":"test","author":"x"}'

# 用 Token 创建文章 → 201
curl http://localhost:3000/posts -X POST \
  -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' \
  -d '{"title":"登录后创建","content":"内容内容内容内容","author":"新用户"}'
```
