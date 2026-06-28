# Day 09 — 项目任务：完整的 TODO API（加强版）

## 业务背景

在 Day 08 的基础上，你需要为 TODO API 加入：分页查询、搜索过滤、批量删除、请求限流。这是生产级 CRUD API 的常见功能。

## 技术要求

基于 Day 08/09 的自建框架，不安装任何包。

## API 扩展

```
GET  /todos?page=1&limit=10&keyword=milk&completed=false
         — 分页 + 搜索 + 状态过滤

DELETE /todos (body: { ids: [1, 2, 3] })
         — 批量删除

GET  /todos/stats
         — 统计：总数/已完成/待完成/完成率
```

## 分页响应格式

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 验收标准

- [ ] 分页（page/limit 参数，默认 page=1, limit=10，limit 最大 100）
- [ ] 关键词搜索（keyword 匹配 title，大小写不敏感）
- [ ] 状态过滤（`completed=true/false`，不传则返回全部）
- [ ] 批量删除（传入 ids 数组，跳过不存在的 id，返回实际删除数量）
- [ ] `/todos/stats` 返回统计信息
- [ ] 所有输入参数做类型校验和边界处理（如 limit 超过 100 则取 100）

## 常见坑

1. **路由顺序**：`GET /todos/stats` 要在 `GET /todos/:id` 之前注册，否则 `stats` 会被当成 `:id` 的值。
2. **query 参数都是字符串**：`req.query.completed === 'true'` 而不是 `=== true`；`req.query.page` 需要 `parseInt`。
3. **批量删除的 body**：DELETE 请求通常没有 body，但这里需要。注意 body parser 中间件要处理 DELETE 请求的 content-type。
