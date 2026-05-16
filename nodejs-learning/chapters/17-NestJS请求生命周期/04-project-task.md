# Day 17 — 项目任务：完整请求流水线

## 业务背景

在 Day 16 的博客 API 基础上，加入完整的安全 + 监控层：请求日志、统一响应格式、JWT 鉴权、角色控制、全局异常格式化。这是生产级 API 的必备基础设施。

## 技术要求

在已有的 `blog-api` 项目上添加：

1. **LoggerMiddleware**：全局日志，记录 `method url status duration`，`/health` 排除
2. **JwtAuthGuard**：验证 Bearer Token，未登录返回 401
3. **RolesGuard + @Roles() 装饰器**：角色控制
4. **TransformInterceptor**：成功响应包成 `{ data, meta: { tookMs } }`
5. **AllExceptionsFilter**：统一错误格式 `{ success: false, code, message, timestamp, path }`

## 接口权限矩阵

| 接口 | 未登录 | 普通用户 | admin |
|------|--------|---------|-------|
| GET /posts | ✅ 200 | ✅ 200 | ✅ 200 |
| GET /posts/:id | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /posts | ❌ 401 | ✅ 201 | ✅ 201 |
| PATCH /posts/:id | ❌ 401 | ✅ 200 | ✅ 200 |
| DELETE /posts/:id | ❌ 401 | ❌ 403 | ✅ 204 |

## 验收标准

```bash
# 1. 无 Token 访问受保护接口 → 401，走统一错误格式
curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"test","content":"x","author":"y"}'
# 期望：{"success":false,"code":401,"message":"缺少 Token","timestamp":"...","path":"/posts"}

# 2. 普通用户 Token 删除 → 403
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer USER_TOKEN"

# 3. 管理员 Token 删除 → 204
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer ADMIN_TOKEN" -v

# 4. 成功 GET → 被 TransformInterceptor 包装
curl http://localhost:3000/posts
# 期望：{"data":[...],"meta":{"tookMs":3}}

# 5. 错误响应不被 TransformInterceptor 包装（保持统一错误格式）
curl http://localhost:3000/posts/9999
# 期望：{"success":false,"code":404,"message":"Post #9999 不存在",...}

# 6. 控制台能看到每个请求的日志
```

## 提示（不给完整代码）

- Guard 应该通过 `APP_GUARD` provider 注册，不是 `main.ts` 里 `new`
- 需要生成假 JWT Token 来测试：`jwt.sign({ sub: 1, roles: ['user'] }, 'secret')`
- Filter 里判断 `exception instanceof HttpException` vs 其他异常
- 注意：Delete 接口的 Guard 顺序：先 JwtAuthGuard，再 RolesGuard

## 常见坑

1. Guard 在 `main.ts` 用 `new` 注册，JwtService 注入为 undefined
2. `@Public()` 跳过鉴权的实现：用 `SetMetadata('isPublic', true)` + Guard 里用 Reflector 读取
3. TransformInterceptor 和 Filter 的格式要协调好，不然成功和错误响应风格不一
4. Logger 用 `res.on('finish')` 而不是在 `next()` 之前打印，否则 status code 是 undefined
