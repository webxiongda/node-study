# Day 31 — 里程碑：认证系统验收演示

## 完整测试脚本

```bash
BASE="http://localhost:3000"

# 1. 注册
curl -s -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Password123!","name":"测试用户"}' | jq .

# 2. 登录（获取 AT + RT Cookie）
AT=$(curl -s -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  -c cookies.txt | jq -r .accessToken)

echo "Access Token: $AT"

# 3. 访问受保护接口
curl -s $BASE/auth/profile \
  -H "Authorization: Bearer $AT" | jq .

# 4. 创建文章（需要登录）
curl -s -X POST $BASE/posts \
  -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' \
  -d '{"title":"我的第一篇文章","content":"测试内容，超过十个字符"}' | jq .

# 5. 无 Token 访问 → 401
curl -s -X POST $BASE/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"test","content":"test"}' | jq .

# 6. 续期 AT
NEW_AT=$(curl -s -X POST $BASE/auth/refresh \
  -b cookies.txt | jq -r .accessToken)
echo "New Access Token: $NEW_AT"

# 7. 登出
curl -s -X POST $BASE/auth/logout \
  -H "Authorization: Bearer $AT" \
  -b cookies.txt | jq .

# 8. 登出后 RT 失效
curl -s -X POST $BASE/auth/refresh \
  -b cookies.txt | jq .
# 期望：{"statusCode":401,...}
```
