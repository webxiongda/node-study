# Day 12 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| 资源 vs 动作 | URL 用名词，操作靠 HTTP 方法 |
| URL 规范 | 复数、小写、连字符，不超过3层嵌套 |
| 状态码语义 | 200/201/204/400/401/403/404/409 |
| 分页两种 | offset（跳页）vs cursor（无限滚动）|
| 版本化 | URL 路径版本化（`/v1/`）最推荐 |
| 统一响应 | data 包裹成功，error 对象包错误 |

## 易错点

1. `GET /posts/search?q=` 的 `search` 会被当成 `:id` 路由参数！要先注册精确路由
2. 删除操作用 `DELETE` 返回 `204`，不是 `200`
3. `PATCH` 只更新传入字段；`PUT` 替换整体（没传的字段会被清空）

## 高频面试题

**Q1: REST 的核心原则是什么？**

无状态、资源导向（URL 是名词）、统一接口（HTTP 方法语义）、按需 code（可选）。

**Q2: 你如何设计分页 API？**

提供 `page/limit`（offset 分页，适合后台）和 `after/limit`（cursor 分页，适合 Feed 流）两种。响应中包含 `pagination.total`、`pagination.hasNext` 等元信息。

**Q3: 如何处理 API 错误响应？**

统一格式：`{ error: { code, message, fields? } }`。4xx 错误不记日志（客户端错误），5xx 错误记日志（服务端问题）。

## 自测题

1. `POST /users/login` vs `POST /auth/login`，哪个更 RESTful？
2. 如何设计一个"收藏文章"的 API？
3. 什么时候用 `422 Unprocessable Entity` 而不是 `400 Bad Request`？

## 下一章建议

Day 13（进程管理与 Worker Threads）是面试中"Node.js 如何处理 CPU 密集型任务"的直接答案，和 Day 05 事件循环知识互补。重点：`worker_threads` 的使用和 `cluster` 模式原理。
