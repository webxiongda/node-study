# Day 14 — 验收自测题

---

### 题 1（概念题）
`uncaughtException` 和 `unhandledRejection` 的区别是什么？在这两个事件的处理函数中，是否应该继续运行进程？

---

### 题 2（概念题）
什么是 Graceful Shutdown？Kubernetes 滚动更新时如何触发它？

---

### 题 3（实操题）
以下代码有什么问题？修复它：

```javascript
process.on('uncaughtException', (err) => {
  console.error('Error:', err.message);
  // 继续运行
});

app.get('/user/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  res.json(user.toJSON()); // user 可能是 null
});
```

---

### 题 4（实操题）
实现一个函数 `isAppError(err: unknown): err is AppError`，用于判断一个值是否是 `AppError` 实例：

---

### 题 5（项目应用题）
你的生产服务器上 Node.js 进程偶尔会挂掉（`unhandledRejection`），但日志不清楚是哪段代码导致的。
描述你的排查步骤和改进方案。

---

## 参考答案

### 题 1
- `uncaughtException`：同步代码中 `throw` 了但没有被 try/catch 捕获的异常
- `unhandledRejection`：Promise.reject() 了但没有 `.catch()` 处理

**是否继续运行：**
- `uncaughtException` 后**不建议继续运行**：进程状态已不可预知（内存可能已损坏、锁未释放等），继续运行可能产生更严重的问题。应该记录日志后优雅退出。
- `unhandledRejection` 视情况：Node.js 15+ 默认终止进程；可以只记录日志但不退出，但要彻底找出根因修复。

### 题 2
Graceful Shutdown：收到停止信号后，停止接受新请求，等待当前请求完成（有超时），释放资源（DB 连接、文件句柄）后退出。

Kubernetes 滚动更新时：先发 `SIGTERM` 信号，等待 `terminationGracePeriodSeconds`（默认 30秒），超时后发 `SIGKILL` 强杀。应用需要监听 `SIGTERM` 实现优雅退出。

### 题 3
两个问题：
1. `uncaughtException` 处理后继续运行：不安全
2. `user.toJSON()` 在 `user === null` 时会抛出 TypeError，这个错误在 async 中会变成 unhandledRejection

修复：
```javascript
// 1. uncaughtException 后退出
process.on('uncaughtException', (err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

// 2. 检查 user 是否存在
app.get('/user/:id', async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    if (!user) throw new NotFoundError('User');
    res.json(user.toJSON());
  } catch (err) {
    next(err); // 交给错误处理中间件
  }
});
```

### 题 4
```javascript
function isAppError(err) {
  return err instanceof AppError;
}

// TypeScript 版本
function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

// 使用
try {
  await someOperation();
} catch (err) {
  if (isAppError(err)) {
    res.status(err.status).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

### 题 5
排查步骤：
1. **查完整 rejection 信息**：`console.error('UNHANDLED REJECTION:', reason, reason?.stack)` — 确保打印了完整 stack trace
2. **搜索代码中所有 Promise 用法**：找没有 catch 的 `.then()`、未 await 的 async 调用
3. **使用 `--trace-warnings`**：`node --trace-warnings app.js`，显示更详细的警告来源
4. **开启 unhandledRejection 严格模式**：设置 `NODE_OPTIONS=--unhandled-rejections=throw`

改进方案：
1. 全局 `unhandledRejection` 记录详细日志（含 stack trace）并告警
2. 代码规范：所有 async 函数必须 try/catch，或用全局错误处理中间件包裹
3. ESLint 规则：`no-floating-promises`（禁止未 await 的 Promise）
