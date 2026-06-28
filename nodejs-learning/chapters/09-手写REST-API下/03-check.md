# Day 09 — 验收自测题

---

### 题 1（概念题）
中间件不调用 `next()` 会发生什么？什么时候应该不调用 `next()`？

---

### 题 2（概念题）
Express 和 Koa 的中间件模型有什么本质区别？用代码说明。

---

### 题 3（实操题）
以下中间件顺序有什么问题？应该如何调整？

```javascript
app.use(routeHandler);   // 路由处理
app.use(cors);           // CORS
app.use(logger);         // 日志
app.use(errorHandler);   // 错误处理
app.use(bodyParser);     // body 解析
```

---

### 题 4（实操题）
实现一个 `rateLimit(limit, windowMs)` 中间件，限制同一 IP 在 windowMs 毫秒内最多 limit 次请求，超出返回 429。

---

### 题 5（项目应用题）
你的 API 需要认证，`/auth/login` 和 `/auth/register` 不需要认证，其他所有接口都需要。
如何设计认证中间件？（不需要实现真实 JWT，用伪代码说明逻辑）

---

## 参考答案

### 题 1
不调用 `next()` 时，中间件链终止，后续中间件和路由 handler 都不会执行。应该不调用的场景：认证失败（直接返回 401）、CORS 预检请求（直接返回 204）、已发送响应（res.end 之后）。

### 题 2
Express 是线性模型，next() 是单向的；Koa 是洋葱模型，await next() 前后都能执行代码：
```javascript
// Koa 风格的洋葱
app.use(async (ctx, next) => {
  const start = Date.now();     // 请求进入
  await next();                  // ← 执行后续所有中间件
  const ms = Date.now() - start; // 响应返回后，计算总时长
  ctx.set('X-Response-Time', ms + 'ms');
});
// Express 无法在 next() 之后拿到响应状态（res 可能已经发送）
```

### 题 3
正确顺序：
1. **logger**（最先，捕获所有请求）
2. **cors**（在路由之前，预检要先拦截）
3. **bodyParser**（路由需要解析 body 才能处理）
4. **routeHandler**（路由处理）
5. **errorHandler**（最后，捕获所有错误）

```javascript
app.use(logger);
app.use(cors);
app.use(bodyParser);
app.use(routeHandler);
app.use(errorHandler);
```

### 题 4
```javascript
function rateLimit(limit = 100, windowMs = 60000) {
  const store = new Map(); // IP -> { count, resetAt }
  
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress;
    const now = Date.now();
    
    if (!store.has(ip) || store.get(ip).resetAt < now) {
      store.set(ip, { count: 0, resetAt: now + windowMs });
    }
    
    const record = store.get(ip);
    record.count++;
    
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - record.count)));
    
    if (record.count > limit) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too Many Requests' }));
    }
    next();
  };
}
```

### 题 5
```javascript
const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

function authenticate(req, res, next) {
  // 公开路由直接放行
  if (PUBLIC_PATHS.includes(req.url.split('?')[0])) return next();
  
  // 提取 token
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }
  
  const token = auth.slice(7);
  try {
    // 伪代码：验证 token
    const payload = verifyJWT(token);
    req.user = payload; // 将用户信息挂到 req 上
    next();
  } catch {
    next(new UnauthorizedError());
  }
}

app.use(authenticate); // 全局认证中间件
```
