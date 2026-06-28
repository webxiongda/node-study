# Day 08 — 实操 Demo

## Demo：完整的 TODO API（不使用任何框架）

```javascript
// todo-api.js — 完整的 TODO CRUD API

// ========== 工具函数 ==========
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (!req.headers['content-type']?.includes('application/json')) return resolve({});
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject({ status: 400, message: 'Invalid JSON' }); } });
  });
}

// ========== 路由器 ==========
class Router {
  constructor() { this.routes = []; }
  
  _compile(path) {
    const names = [];
    const pattern = path.replace(/:([^/]+)/g, (_, n) => { names.push(n); return '([^/]+)'; });
    return { re: new RegExp('^' + pattern + '$'), names };
  }
  
  add(method, path, fn) {
    const { re, names } = this._compile(path);
    this.routes.push({ method, re, names, fn });
  }
  
  match(method, path) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = path.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.names.map((n, i) => [n, m[i + 1]]));
      return { fn: r.fn, params };
    }
    return null;
  }
}

// ========== 数据存储（内存） ==========
let todos = [];
let nextId = 1;

// ========== 路由注册 ==========
const router = new Router();

// GET /todos — 获取所有
router.add('GET', '/todos', (req, res) => {
  res.json(todos);
});

// GET /todos/:id — 获取单个
router.add('GET', '/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === Number(req.params.id));
  if (!todo) return res.json({ error: 'Not found' }, 404);
  res.json(todo);
});

// POST /todos — 创建
router.add('POST', '/todos', (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.json({ error: 'title is required' }, 400);
  const todo = { id: nextId++, title: title.trim(), completed: false, createdAt: new Date().toISOString() };
  todos.push(todo);
  res.json(todo, 201);
});

// PATCH /todos/:id — 更新
router.add('PATCH', '/todos/:id', (req, res) => {
  const idx = todos.findIndex(t => t.id === Number(req.params.id));
  if (idx === -1) return res.json({ error: 'Not found' }, 404);
  todos[idx] = { ...todos[idx], ...req.body, id: todos[idx].id };
  res.json(todos[idx]);
});

// DELETE /todos/:id — 删除
router.add('DELETE', '/todos/:id', (req, res) => {
  const idx = todos.findIndex(t => t.id === Number(req.params.id));
  if (idx === -1) return res.json({ error: 'Not found' }, 404);
  todos.splice(idx, 1);
  res.writeHead(204); res.end();
});

// ========== HTTP 服务器 ==========
const http = require('http');
http.createServer(async (req, res) => {
  res.json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  
  try {
    const url = new URL(req.url, 'http://localhost');
    req.body = await parseJsonBody(req);
    const result = router.match(req.method, url.pathname);
    if (!result) return res.json({ error: 'Not Found' }, 404);
    req.params = result.params;
    req.query = Object.fromEntries(url.searchParams);
    await result.fn(req, res);
  } catch (err) {
    if (err.status) return res.json({ error: err.message }, err.status);
    console.error(err);
    res.json({ error: 'Internal Server Error' }, 500);
  }
}).listen(3000, () => console.log('TODO API: http://localhost:3000'));
```

**测试：**
```bash
# 创建
curl -X POST -H "Content-Type: application/json" -d '{"title":"Buy milk"}' http://localhost:3000/todos
# 获取所有
curl http://localhost:3000/todos
# 更新
curl -X PATCH -H "Content-Type: application/json" -d '{"completed":true}' http://localhost:3000/todos/1
# 删除
curl -X DELETE http://localhost:3000/todos/1
```
