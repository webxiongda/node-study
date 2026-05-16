# Day 08 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| 路由匹配原理 | 数组 + 正则，按注册顺序匹配 |
| 路由参数提取 | `:id` → 正则 capture group，按名字映射 |
| 精确路由优先 | `/users/me` 要在 `/users/:id` 之前注册 |
| body 大小限制 | 防 DoS，超出立即断开连接 |
| JSON body 解析 | 监听 req data/end，判断 Content-Type |

## 易错点

1. 路由顺序很重要：精确路由必须在通配参数路由之前
2. `req.url` 包含 query string（如 `/users?page=1`），匹配路径时要用 `url.pathname`
3. URL 中的参数值需要 `decodeURIComponent`（如 `%20` → 空格）
4. body 读取是异步流，不能直接 `req.body`，必须先等待 data/end 事件

## 高频面试题

**Q1: Express Router 的底层实现原理？**

答：维护一个路由数组，每条路由包含：方法、路径正则、参数名列表、handler 数组（中间件链）。请求进来时按顺序正则匹配，找到后依次执行 handler，每个 handler 调用 `next()` 进入下一个。

**Q2: Express 中 `router.get('/users/me')` 和 `router.get('/users/:id')` 都注册了，请求 `/users/me` 会命中哪个？**

答：取决于注册顺序。先注册的先匹配。如果 `/users/:id` 先注册，`me` 会作为 id 参数，命中 `:id` handler。所以精确路由要先注册。

## 自测题

1. 路径 `/posts/:postId/comments/:commentId` 对应的正则是什么？
2. 如何防止 body 过大导致 OOM？
3. 为什么不能用 `Map<string, handler>` 实现路由表？

## 下一章建议

Day 09（中间件模式）是框架设计的精髓。理解中间件链如何工作，是理解 Express、Koa、NestJS 的基础，也是面试常考"Express 中间件原理"的答案来源。
