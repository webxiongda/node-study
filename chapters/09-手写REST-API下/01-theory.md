# Day 09 — 手写 REST API（下）· 中间件模式 · 理论文档

## 核心概念

### 1. 中间件模式原理（⭐ 面试重点）

中间件本质是：**函数链 + 控制权传递（next）**

```javascript
// 中间件签名
type Middleware = (req, res, next) => void | Promise<void>

// 中间件引擎：将多个中间件组合成一条执行链
class MiddlewareEngine {
  constructor() {
    this.middlewares = [];
  }
  
  use(fn) {
    this.middlewares.push(fn);
  }
  
  // 执行中间件链
  async execute(req, res) {
    let index = 0;
    
    const next = async (err) => {
      if (err) throw err; // 错误中间件处理
      if (index >= this.middlewares.length) return;
      const middleware = this.middlewares[index++];
      await middleware(req, res, next);
    };
    
    await next();
  }
}
```

**中间件执行流程（洋葱模型）：**
```
请求 → [logger] → [auth] → [handler] → [错误处理]
             ↑ next() ↑ next() ↑ next()
响应 ← [logger] ← [auth] ← [handler]
```

每个中间件可以：
1. 执行逻辑
2. 修改 `req`/`res`
3. 调用 `next()` 传递控制权
4. 调用 `next(error)` 跳到错误处理中间件
5. **不调用 next()** → 终止链，直接响应（如认证失败）

---

### 2. 常用中间件实现

**日志中间件：**
```javascript
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
```

**CORS 中间件：**
```javascript
function cors(options = {}) {
  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', options.origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204); res.end();
      return; // 不调用 next()，终止
    }
    next();
  };
}
```

**JSON Body 解析中间件：**
```javascript
function jsonParser(req, res, next) {
  if (!req.headers['content-type']?.includes('application/json')) return next();
  
  let data = '';
  req.on('data', chunk => {
    data += chunk;
    if (data.length > 1e6) return next(Object.assign(new Error('Body too large'), { status: 413 }));
  });
  req.on('end', () => {
    try {
      req.body = data ? JSON.parse(data) : {};
      next();
    } catch {
      next(Object.assign(new Error('Invalid JSON'), { status: 400 }));
    }
  });
}
```

**错误处理中间件（必须是四个参数）：**
```javascript
function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? 'Internal Server Error';
  
  if (status === 500) console.error(err); // 只记录 5xx 错误
  
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: { message, ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }) }
  }));
}
```

---

### 3. 自定义业务错误类

```javascript
class AppError extends Error {
  constructor(message, status = 500, code) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor() {
    super('Forbidden', 403, 'FORBIDDEN');
  }
}
```

使用：
```javascript
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User'); // 错误处理中间件会捕获
  res.json(user);
});
```

---

## 面试高频问题

**Q1: Express 中间件是什么？如何工作的？**

答：中间件是有 `(req, res, next)` 签名的函数。Express 维护一个中间件数组，请求进来时依次执行，每个中间件通过调用 `next()` 传递给下一个。调用 `next(err)` 会跳过普通中间件，直接到四参数的错误处理中间件。不调用 `next()` 则终止链（如认证失败直接响应 401）。

**Q2: Koa 的中间件和 Express 有什么区别？**

答：Express 是线性的（next 是单向的）；Koa 是"洋葱模型"（await next() 之后可以继续执行，形成真正的双向穿透）。Koa 基于 Promise，天然支持 async/await。

```javascript
// Koa 中间件（真正的洋葱）
app.use(async (ctx, next) => {
  console.log('before');  // 请求进入时
  await next();            // 调用后续中间件
  console.log('after');   // 响应返回时（在这里可以修改响应）
});
```

**Q3: 中间件的顺序重要吗？**

答：非常重要。日志应该最先（捕获所有请求），错误处理应该最后（捕获前面所有中间件的错误），CORS 应该在路由之前（预检请求要在路由匹配前拦截）。
