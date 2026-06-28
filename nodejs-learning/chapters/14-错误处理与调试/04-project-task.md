# Day 14 — 项目任务：为 TODO API 加完整错误处理

## 业务背景

将 Day 10 的 `mini-todo-api` 升级为生产级别的错误处理，要求能安全部署，不因未处理的错误崩溃，且能优雅退出。

## 任务内容

### 1. 完善自定义错误类
```javascript
// 需要有：AppError、NotFoundError、ValidationError、UnauthorizedError、ForbiddenError、ConflictError
// 每个类有 status、code、message
// ValidationError 额外有 fields 字段（字段级错误）
```

### 2. 添加全局错误兜底
```javascript
process.on('uncaughtException', ...)
process.on('unhandledRejection', ...)
```

### 3. 实现 Graceful Shutdown
- 监听 SIGTERM 和 SIGINT
- 停止接受新请求
- 等待当前请求完成（超时 30s）
- 退出码 0（正常）或 1（超时）

### 4. 改造错误响应格式
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Todo not found",
    "requestId": "uuid-xxxx"
  }
}
```
加上 `X-Request-ID` 响应头（随机 UUID），方便日志追踪。

## 验收标准

- [ ] `POST /todos` 不传 title → ValidationError（400）+ 字段级错误
- [ ] `GET /todos/999` 不存在 → NotFoundError（404）
- [ ] 代码中故意 throw new Error → uncaughtException 被捕获，进程优雅退出
- [ ] Ctrl+C → Graceful Shutdown，打印"所有连接已关闭"
- [ ] 每个响应都有 `X-Request-ID` 响应头

## 常见坑

1. **`server.close()` 的行为**：只停止接受新连接，已建立的 keep-alive 连接还会继续。需要手动跟踪并关闭所有连接，或用 `server.closeAllConnections()`（Node.js 18.2+）。
2. **测试 graceful shutdown**：启动服务后，`kill -TERM <pid>` 发送 SIGTERM；或者直接 Ctrl+C 发送 SIGINT。
3. **requestId 传递**：在请求开始时生成 UUID 挂到 `req.id`，错误处理中间件从 `req.id` 读取并放入响应。
