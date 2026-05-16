# Day 30 — 项目任务：博客 API 安全加固

## 任务

1. 添加 Helmet（安全 HTTP headers）
2. 配置 CORS（只允许前端域名）
3. 登录接口添加限流（1分钟最多5次）
4. 评论内容用 `sanitize-html` 过滤 XSS
5. 用 curl 验证安全 headers 存在

## 验收

```bash
# 安全 headers 验证
curl -I http://localhost:3000/health
# 看到 X-Content-Type-Options, X-Frame-Options 等

# 限流测试（连续6次登录应该第6次被 429）
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 第5次及之后：{"statusCode":429,"message":"Too Many Requests"}

# XSS 输入测试（评论里的 script 标签应该被过滤）
curl -X POST http://localhost:3000/posts/1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"<script>alert(1)</script>好文章"}'
# 响应里 content 应该是 "好文章"（script 被过滤）
```
