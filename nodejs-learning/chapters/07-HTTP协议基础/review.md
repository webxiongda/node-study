# Day 07 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| GET vs POST | GET 幂等安全，参数在 URL；POST 创建，参数在 body |
| PUT vs PATCH | PUT 替换整体，PATCH 局部更新 |
| 401 vs 403 | 401 未认证（没登录），403 未授权（没权限）|
| 201 vs 200 | 201 用于资源创建成功，200 用于普通成功 |
| 204 | 成功无响应体（DELETE 常用）|
| CORS 预检 | 非简单请求触发 OPTIONS，服务端返回 Allow 头 |
| node:http | createServer + req 流读取 body + res.writeHead/end |

## 易错点

1. `401 Unauthorized` 语义是"未认证"，`403 Forbidden` 是"已认证但无权限"——命名有点反直觉
2. DELETE 成功返回 **204**（不是 200），不需要响应体
3. `Content-Type: application/json` 的 POST 请求会触发 CORS 预检，不是简单请求
4. `Access-Control-Allow-Origin: *` 时不能同时设置 `Allow-Credentials: true`

## 高频面试题

**Q1: GET 和 POST 的区别？**

语义：GET 读，POST 写/提交。GET 幂等，POST 不幂等。GET 参数在 URL（可缓存），POST 在 body。GET 有长度限制（URL 长度），POST 无明确限制。

**Q2: 常见状态码？**

200 成功 / 201 创建 / 204 无内容 / 301 永久重定向 / 304 缓存 / 400 请求错误 / 401 未认证 / 403 无权限 / 404 不存在 / 409 冲突 / 429 限流 / 500 服务器错误。

**Q3: CORS 是什么，如何解决？**

答：浏览器同源策略限制跨域请求。解决：服务端在响应头加 `Access-Control-Allow-Origin`、`Allow-Methods`、`Allow-Headers`。预检 OPTIONS 请求要返回 204。

## 自测题

1. `422 Unprocessable Entity` 和 `400 Bad Request` 有什么区别？
2. 什么是幂等性？DELETE 是幂等的吗？
3. `ETag` 和 `Last-Modified` 各用于什么缓存策略？
4. 为什么 `POST /login` 不建议改成 `GET /login?username=x&password=y`？

## 下一章建议

Day 08（手写 REST API 上）开始写真正的路由系统。理解路由匹配算法是理解 Express/Koa/Fastify 底层的基础，也是面试中"你如何实现一个框架"的常见考题。
