# Day 14 — 实操 Demo

## Demo：完整错误处理 + 优雅退出

```javascript
// errors.js（自定义错误体系）
class AppError extends Error {
  constructor(msg, status = 500, code = 'INTERNAL') {
    super(msg);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
class NotFoundError extends AppError {
  constructor(r = 'Resource') { super(`${r} not found`, 404, 'NOT_FOUND'); }
}
class ValidationError extends AppError {
  constructor(msg, fields = []) {
    super(msg, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}
module.exports = { AppError, NotFoundError, ValidationError };

// server.js（带 graceful shutdown 的完整服务）
const http = require('http');
const { NotFoundError, ValidationError } = require('./errors');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (req.url === '/crash') throw new Error('Intentional crash!');
    if (req.url === '/notfound') throw new NotFoundError('Article');
    if (req.url === '/validation') throw new ValidationError('Invalid input', [
      { field: 'email', message: '格式错误' }
    ]);
    
    res.writeHead(200);
    res.end(JSON.stringify({ data: 'OK', pid: process.pid }));
  } catch (err) {
    const status = err.status ?? 500;
    if (status >= 500) console.error('500 Error:', err);
    
    res.writeHead(status);
    res.end(JSON.stringify({
      error: {
        code: err.code ?? 'INTERNAL',
        message: err.message,
        ...(err.fields && { fields: err.fields }),
        ...(process.env.NODE_ENV !== 'production' && status >= 500 && { stack: err.stack }),
      }
    }));
  }
});

// Graceful Shutdown
let isShuttingDown = false;

server.on('request', (req, res) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    res.writeHead(503);
    res.end(JSON.stringify({ error: 'Server is shutting down' }));
  }
});

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[${signal}] 开始优雅退出...`);
  
  server.close(() => {
    console.log('✅ 所有连接已关闭，进程退出');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('❌ 优雅退出超时，强制退出');
    process.exit(1);
  }, 10_000);
}

// 全局错误兜底
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  // 不退出，只记录（视业务而定）
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

server.listen(3000, () => console.log(`Server (PID ${process.pid}) http://localhost:3000`));
```
