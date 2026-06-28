# Day 09 — 实操 Demo

## Demo：带完整中间件的 TODO API

```javascript
// 自定义错误类
class AppError extends Error {
  constructor(msg, status = 500) { super(msg); this.status = status; }
}

// 中间件引擎
class App {
  constructor() {
    this.middlewares = [];
    this.router = new Router(); // Day 08 的 Router
  }
  
  use(fn) { this.middlewares.push(fn); }
  get(path, ...fns) { this.router.add('GET', path, fns); }
  post(path, ...fns) { this.router.add('POST', path, fns); }
  patch(path, ...fns) { this.router.add('PATCH', path, fns); }
  delete(path, ...fns) { this.router.add('DELETE', path, fns); }
  
  async _run(req, res, handlers) {
    let i = 0;
    const next = async (err) => {
      if (err) throw err;
      if (i >= handlers.length) return;
      await handlers[i++](req, res, next);
    };
    await next();
  }
  
  listen(port) {
    const http = require('http');
    http.createServer(async (req, res) => {
      res.json = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      
      try {
        // 执行全局中间件
        await this._run(req, res, this.middlewares);
        
        // 路由匹配
        const url = new URL(req.url, 'http://localhost');
        const result = this.router.match(req.method, url.pathname);
        if (!result) throw new AppError('Not Found', 404);
        
        req.params = result.params;
        req.query = Object.fromEntries(url.searchParams);
        
        // 执行路由 handler 链
        await this._run(req, res, result.fn);
      } catch (err) {
        const status = err.status ?? 500;
        if (status >= 500) console.error(err);
        res.json({ error: err.message }, status);
      }
    }).listen(port, () => console.log(`http://localhost:${port}`));
  }
}

// ========== 使用 ==========
const app = new App();

// 全局中间件（注册顺序很重要！）
app.use((req, res, next) => {          // 1. 日志
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now()-t}ms`));
  next();
});

app.use((req, res, next) => {          // 2. CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  next();
});

app.use((req, res, next) => {          // 3. JSON body 解析
  if (!req.headers['content-type']?.includes('application/json')) return next();
  let d = '';
  req.on('data', c => d += c);
  req.on('end', () => { req.body = d ? JSON.parse(d) : {}; next(); });
});

// 路由
let todos = [], nextId = 1;

// 验证中间件（可复用）
const requireTitle = (req, res, next) => {
  if (!req.body?.title?.trim()) throw new AppError('title is required', 400);
  next();
};

app.get('/todos', (req, res) => res.json(todos));
app.get('/todos/:id', (req, res) => {
  const t = todos.find(t => t.id === +req.params.id);
  if (!t) throw new AppError('Not found', 404);
  res.json(t);
});
app.post('/todos', requireTitle, (req, res) => {
  const t = { id: nextId++, title: req.body.title.trim(), completed: false };
  todos.push(t);
  res.json(t, 201);
});
app.patch('/todos/:id', (req, res) => {
  const t = todos.find(t => t.id === +req.params.id);
  if (!t) throw new AppError('Not found', 404);
  Object.assign(t, req.body, { id: t.id });
  res.json(t);
});
app.delete('/todos/:id', (req, res) => {
  const idx = todos.findIndex(t => t.id === +req.params.id);
  if (idx === -1) throw new AppError('Not found', 404);
  todos.splice(idx, 1);
  res.writeHead(204); res.end();
});

app.listen(3000);
```
