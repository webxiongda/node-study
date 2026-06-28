# Day 14 — 错误处理与调试技巧 · 理论文档

## 核心概念

### 1. 自定义错误类体系

```javascript
// 基类
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor); // 优化 stack trace
  }
}

// 具体错误类
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message, fields = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields; // [{ field: 'email', message: '格式错误' }]
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401, 'UNAUTHORIZED'); }
}

class ForbiddenError extends AppError {
  constructor() { super('Forbidden', 403, 'FORBIDDEN'); }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409, 'CONFLICT'); }
}
```

---

### 2. 全局错误捕获（生产必备）

```javascript
// 未捕获的同步异常
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // 建议：记录日志 + 优雅退出
  // 不建议继续运行：进程状态不可预知
  process.exit(1);
});

// 未处理的 Promise Rejection（Node.js 15+ 默认会终止进程）
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  // 可以选择不退出，但要记录日志
});
```

---

### 3. Graceful Shutdown（优雅退出）— 面试考点

```javascript
const http = require('http');
const server = http.createServer(app);

// 优雅退出：等待现有请求处理完再关闭
function gracefulShutdown(signal) {
  console.log(`收到 ${signal}，开始优雅退出...`);
  
  server.close(() => {
    console.log('HTTP 服务器已关闭（没有新请求）');
    // 关闭数据库连接
    // db.disconnect();
    // 关闭其他资源
    console.log('资源已释放，进程退出');
    process.exit(0);
  });
  
  // 超时强制退出（30秒内没有完成，强制退出）
  setTimeout(() => {
    console.error('优雅退出超时，强制退出');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill 命令
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));  // Ctrl+C
```

**为什么重要？** 不优雅退出会导致：正在处理的请求被中断（用户收到错误）、数据库事务未提交（数据损坏）、文件写入中断（文件损坏）。

---

### 4. 调试工具

**方式1：Chrome DevTools 调试**
```bash
# 启动调试模式（--inspect）
node --inspect src/index.js

# 断在第一行（用于调试启动问题）
node --inspect-brk src/index.js
```
然后在 Chrome 打开 `chrome://inspect`，点击 `inspect` 进入调试界面。

**方式2：VS Code 调试**
创建 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Node.js",
      "program": "${workspaceFolder}/src/index.js",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

**方式3：console 调试技巧**
```javascript
// 打印对象（避免 [Object]）
console.log(JSON.stringify(obj, null, 2));
console.dir(obj, { depth: null }); // 完整展开嵌套对象

// 时间测量
console.time('operation');
await someAsyncOperation();
console.timeEnd('operation'); // 'operation: 234ms'

// 条件断点（不用调试器）
if (someCondition) debugger; // 如果连了调试器会暂停
```

---

## 面试高频问题

**Q1: 什么是 Graceful Shutdown？为什么重要？**

答：优雅退出是指收到停止信号（SIGTERM）时，先停止接受新请求，等待正在处理的请求完成，然后释放资源（关数据库连接、刷新日志）再退出。Kubernetes 等容器调度系统在滚动更新时会发 SIGTERM，不处理会导致用户请求中断。

**Q2: uncaughtException 和 unhandledRejection 的区别？**

答：`uncaughtException` 捕获未处理的同步异常（`throw new Error()`）；`unhandledRejection` 捕获没有 `.catch()` 的 Promise rejection。Node.js 15+ 中，`unhandledRejection` 默认行为是终止进程。

**Q3: 如何在生产环境调试 Node.js？**

答：不能直接 `--inspect`（暴露调试端口有安全风险）。方式：① 远程调试（SSH 隧道 + `--inspect=127.0.0.1:9229`）；② 增加结构化日志（Pino/Winston），分析日志定位问题；③ 使用 APM（如 Datadog/Sentry）追踪慢请求和错误。
