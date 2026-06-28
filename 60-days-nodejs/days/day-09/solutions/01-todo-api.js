// Day 09 - 练习 1：完善 TODO API（中间件版）

import http from 'node:http';

// ============ 错误类 ============

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 404);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 422);
  }
}

// ============ 路由器 ============

class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler) { this.routes.push({ method: 'GET', path, handler }); }
  post(path, handler) { this.routes.push({ method: 'POST', path, handler }); }
  put(path, handler) { this.routes.push({ method: 'PUT', path, handler }); }
  patch(path, handler) { this.routes.push({ method: 'PATCH', path, handler }); }
  delete(path, handler) { this.routes.push({ method: 'DELETE', path, handler }); }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this._matchPath(route.path, pathname);
      if (params !== null) {
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  _matchPath(routePath, requestPath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);
    if (routeParts.length !== requestParts.length) return null;

    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = requestParts[i];
      } else if (routeParts[i] !== requestParts[i]) {
        return null;
      }
    }
    return params;
  }
}

// ============ 中间件引擎 ============

class MiddlewareEngine {
  constructor() {
    this.middlewares = [];
  }

  use(fn) {
    this.middlewares.push(fn);
  }

  async execute(req, res) {
    let index = 0;
    const next = async () => {
      if (index >= this.middlewares.length) return;
      const middleware = this.middlewares[index++];
      await middleware(req, res, next);
    };
    await next();
  }
}

// ============ 中间件：错误处理（最外层） ============

function errorHandler() {
  return async (req, res, next) => {
    try {
      await next();
    } catch (error) {
      console.error('❌ 未捕获的错误:', error.message);
      const statusCode = error.statusCode || 500;
      const message = statusCode === 500 ? '服务器内部错误' : error.message;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      }));
    }
  };
}

// ============ 中间件：请求日志 ============

function logger() {
  return async (req, res, next) => {
    const start = Date.now();
    const { method, url } = req;

    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const color =
        status >= 500 ? '\x1b[31m' :
        status >= 400 ? '\x1b[33m' :
        status >= 300 ? '\x1b[36m' :
        '\x1b[32m';
      console.log(`${color}${status}\x1b[0m ${method} ${url} — ${duration}ms`);
      originalEnd.apply(this, args);
    };

    await next();
  };
}

// ============ 中间件：CORS ============

function cors(options = {}) {
  const {
    origin = '*',
    methods = 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    headers = 'Content-Type, Authorization',
    maxAge = 86400,
  } = options;

  return async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Max-Age', String(maxAge));

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    await next();
  };
}

// ============ 中间件：JSON 解析 ============

function jsonParser(options = {}) {
  const { limit = 1024 * 1024 } = options; // 默认 1MB

  return async (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          req.body = await readBody(req, limit);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }
    }
    req.body = req.body || {};
    await next();
  };
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new Error('请求体超出大小限制'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('无效的 JSON 格式'));
      }
    });

    req.on('error', reject);
  });
}

// ============ 应用搭建 ============

const app = new MiddlewareEngine();
const router = new Router();

app.use(errorHandler());
app.use(logger());
app.use(cors());
app.use(jsonParser());

// 路由分发中间件
app.use(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = router.match(req.method, url.pathname);

  if (match) {
    req.params = match.params;
    req.query = Object.fromEntries(url.searchParams);
    await match.handler(req, res);
  } else {
    throw new NotFoundError(`路由 ${req.method} ${url.pathname}`);
  }
});

// ============ 数据存储 ============

let todos = [
  { id: 1, title: '学习 Node.js', completed: false, priority: 2, createdAt: new Date().toISOString() },
  { id: 2, title: '学习 Express 框架', completed: false, priority: 3, createdAt: new Date().toISOString() },
  { id: 3, title: '完成项目作业', completed: true, priority: 5, createdAt: new Date().toISOString() },
];
let nextId = 4;

// ============ 辅助函数 ============

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  if (data !== undefined) {
    res.end(JSON.stringify(data, null, 2));
  } else {
    res.end();
  }
}

// ============ 路由定义 ============

// GET /api/todos — 支持分页、过滤、排序、模糊搜索
router.get('/api/todos', (req, res) => {
  const {
    page = '1',
    limit = '10',
    completed,
    sort,
    order = 'asc',
    search,
  } = req.query;

  let result = [...todos];

  // 1. 按完成状态过滤
  if (completed !== undefined) {
    const isCompleted = completed === 'true';
    result = result.filter((t) => t.completed === isCompleted);
  }

  // 2. 模糊搜索（匹配 title）
  if (search) {
    const keyword = search.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(keyword));
  }

  // 3. 排序
  if (sort) {
    const dir = order === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      if (a[sort] < b[sort]) return -dir;
      if (a[sort] > b[sort]) return dir;
      return 0;
    });
  }

  // 4. 分页
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const total = result.length;
  const totalPages = Math.ceil(total / l);
  const start = (p - 1) * l;
  const paged = result.slice(start, start + l);

  sendJSON(res, 200, {
    data: paged,
    pagination: { page: p, limit: l, total, totalPages },
  });
});

// GET /api/todos/:id — 获取单个 TODO
router.get('/api/todos/:id', (req, res) => {
  const todo = todos.find((t) => t.id === parseInt(req.params.id));
  if (!todo) throw new NotFoundError('TODO');
  sendJSON(res, 200, { data: todo });
});

// POST /api/todos — 创建 TODO
router.post('/api/todos', (req, res) => {
  const { title, priority = 3 } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ValidationError('title 不能为空');
  }
  if (title.length > 200) {
    throw new ValidationError('title 不能超过 200 个字符');
  }

  const todo = {
    id: nextId++,
    title: title.trim(),
    completed: false,
    priority: Math.min(5, Math.max(1, parseInt(priority) || 3)),
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  sendJSON(res, 201, { data: todo });
});

// PUT /api/todos/:id — 全量更新 TODO
router.put('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
  if (index === -1) throw new NotFoundError('TODO');

  const { title, completed, priority } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('title 不能为空');
    }
    todos[index].title = title.trim();
  }
  if (completed !== undefined) {
    todos[index].completed = Boolean(completed);
  }
  if (priority !== undefined) {
    todos[index].priority = Math.min(5, Math.max(1, parseInt(priority) || 3));
  }
  todos[index].updatedAt = new Date().toISOString();

  sendJSON(res, 200, { data: todos[index] });
});

// PATCH /api/todos/:id — 部分更新 TODO
router.patch('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
  if (index === -1) throw new NotFoundError('TODO');

  const { title, completed, priority } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('title 不能为空');
    }
    todos[index].title = title.trim();
  }
  if (completed !== undefined) todos[index].completed = Boolean(completed);
  if (priority !== undefined) {
    todos[index].priority = Math.min(5, Math.max(1, parseInt(priority) || 3));
  }
  todos[index].updatedAt = new Date().toISOString();

  sendJSON(res, 200, { data: todos[index] });
});

// DELETE /api/todos/:id — 删除单个 TODO
router.delete('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
  if (index === -1) throw new NotFoundError('TODO');
  todos.splice(index, 1);
  sendJSON(res, 204);
});

// DELETE /api/todos — 批量删除（body: { ids: [1, 2, 3] }）
router.delete('/api/todos', (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids 必须是非空数组');
  }

  const idSet = new Set(ids.map(Number));
  const before = todos.length;
  todos = todos.filter((t) => !idSet.has(t.id));
  const deleted = before - todos.length;

  sendJSON(res, 200, { deleted });
});

// ============ 启动服务器 ============

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => app.execute(req, res));

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log('');
  console.log('可用的 API:');
  console.log('  GET    /api/todos              ?page=1&limit=10&completed=true&sort=priority&order=desc&search=学习');
  console.log('  GET    /api/todos/:id');
  console.log('  POST   /api/todos');
  console.log('  PUT    /api/todos/:id');
  console.log('  PATCH  /api/todos/:id');
  console.log('  DELETE /api/todos/:id');
  console.log('  DELETE /api/todos              body: { "ids": [1, 2] }');
  console.log('');
  console.log('测试示例:');
  console.log('  curl "http://localhost:3000/api/todos?sort=priority&order=desc"');
  console.log('  curl "http://localhost:3000/api/todos?completed=false&search=学习"');
  console.log('  curl -X DELETE http://localhost:3000/api/todos \\');
  console.log('       -H "Content-Type: application/json" -d \'{"ids":[1,2]}\'');
});
