# Day 10 — Demo：项目结构参考

> Day 10 没有新的代码 Demo，而是展示如何把 Day 08-09 的代码组织成项目结构。

## 推荐的文件分拆方式

### src/errors.js
```javascript
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}
class NotFoundError extends AppError {
  constructor(res = 'Resource') { super(`${res} not found`, 404, 'NOT_FOUND'); }
}
class ValidationError extends AppError {
  constructor(msg) { super(msg, 400, 'VALIDATION_ERROR'); }
}
module.exports = { AppError, NotFoundError, ValidationError };
```

### src/middleware/logger.js
```javascript
module.exports = function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 500 ? 31 : res.statusCode >= 400 ? 33 : 32;
    console.log(`\x1b[${color}m${req.method}\x1b[0m ${req.url} ${res.statusCode} ${Date.now()-start}ms`);
  });
  next();
};
```

### src/index.js
```javascript
const app = require('./app');
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
```

### 启动脚本（package.json）
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  }
}
```
