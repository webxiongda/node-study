// Day 08 - 练习 1：增强路由器
// 新增功能：支持查询参数、路由分组/前缀、PATCH 方法

import http from 'node:http';

// ============ 增强路由器 ============

class Router {
  constructor(prefix = '') {
    this.routes = [];
    this.prefix = prefix;
  }

  // 内部注册方法，自动拼接前缀
  _register(method, path, handler) {
    this.routes.push({ method, path: this.prefix + path, handler });
  }

  get(path, handler) { this._register('GET', path, handler); }
  post(path, handler) { this._register('POST', path, handler); }
  put(path, handler) { this._register('PUT', path, handler); }
  patch(path, handler) { this._register('PATCH', path, handler); }
  delete(path, handler) { this._register('DELETE', path, handler); }

  // 路由分组：创建带前缀的子路由器，注册完后合并回主路由器
  group(prefix, fn) {
    const sub = new Router(this.prefix + prefix);
    fn(sub);
    this.routes.push(...sub.routes);
    return this;
  }

  // 匹配路由（自动剥离查询参数，并将查询参数解析后返回）
  match(method, urlOrPathname) {
    const [pathname, queryString = ''] = urlOrPathname.split('?');
    const query = Object.fromEntries(new URLSearchParams(queryString));

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const params = this._matchPath(route.path, pathname);
      if (params !== null) {
        return { handler: route.handler, params, query };
      }
    }
    return null;
  }

  // 路径匹配（支持 :param 动态参数）
  _matchPath(routePath, requestPath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);

    if (routeParts.length !== requestParts.length) return null;

    const params = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = requestParts[i];
      } else if (routeParts[i] !== requestParts[i]) {
        return null;
      }
    }

    return params;
  }
}

// ============ JSON 请求体解析器 ============

function parseJSON(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      resolve(null);
      return;
    }

    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 1024 * 1024; // 1MB 限制

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        req.destroy();
        reject(new Error('请求体过大'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('无效的 JSON 格式'));
      }
    });

    req.on('error', reject);
  });
}

// ============ 数据存储（内存） ============

let todos = [
  { id: 1, title: '学习 Node.js', completed: false, priority: 1, createdAt: new Date().toISOString() },
  { id: 2, title: '写 REST API', completed: false, priority: 2, createdAt: new Date().toISOString() },
  { id: 3, title: '部署到生产', completed: false, priority: 3, createdAt: new Date().toISOString() },
];
let nextId = 4;

// ============ 路由定义（使用路由分组） ============

const router = new Router();

// 使用路由分组统一添加 /api/v1 前缀
router.group('/api/v1', (r) => {
  // 获取所有 TODO（支持查询参数：?page=1&limit=10&completed=false）
  r.get('/todos', (req, res) => {
    let result = [...todos];

    // 按 completed 过滤
    if (req.query.completed !== undefined) {
      const completed = req.query.completed === 'true';
      result = result.filter((t) => t.completed === completed);
    }

    // 分页
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const total = result.length;
    const start = (page - 1) * limit;
    const data = result.slice(start, start + limit);

    sendJSON(res, 200, {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // 获取单个 TODO
  r.get('/todos/:id', (req, res) => {
    const todo = todos.find((t) => t.id === parseInt(req.params.id));
    if (!todo) {
      return sendJSON(res, 404, { error: 'TODO 不存在' });
    }
    sendJSON(res, 200, { data: todo });
  });

  // 创建 TODO
  r.post('/todos', async (req, res) => {
    const { title, priority } = req.body || {};
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return sendJSON(res, 400, { error: 'title 是必填项且不能为空' });
    }

    const todo = {
      id: nextId++,
      title: title.trim(),
      completed: false,
      priority: typeof priority === 'number' ? priority : 1,
      createdAt: new Date().toISOString(),
    };
    todos.push(todo);
    sendJSON(res, 201, { data: todo });
  });

  // 全量更新 TODO（PUT）
  r.put('/todos/:id', async (req, res) => {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) {
      return sendJSON(res, 404, { error: 'TODO 不存在' });
    }

    const { title, completed, priority } = req.body || {};
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return sendJSON(res, 400, { error: 'title 是必填项且不能为空' });
    }

    todos[index] = {
      ...todos[index],
      title: title.trim(),
      completed: Boolean(completed),
      priority: typeof priority === 'number' ? priority : todos[index].priority,
      updatedAt: new Date().toISOString(),
    };

    sendJSON(res, 200, { data: todos[index] });
  });

  // 部分更新 TODO（PATCH）
  r.patch('/todos/:id', async (req, res) => {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) {
      return sendJSON(res, 404, { error: 'TODO 不存在' });
    }

    const { title, completed, priority } = req.body || {};

    // 只更新提供的字段
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return sendJSON(res, 400, { error: 'title 不能为空字符串' });
      }
      todos[index].title = title.trim();
    }
    if (completed !== undefined) todos[index].completed = Boolean(completed);
    if (priority !== undefined) todos[index].priority = priority;
    todos[index].updatedAt = new Date().toISOString();

    sendJSON(res, 200, { data: todos[index] });
  });

  // 删除 TODO
  r.delete('/todos/:id', (req, res) => {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) {
      return sendJSON(res, 404, { error: 'TODO 不存在' });
    }
    todos.splice(index, 1);
    sendJSON(res, 204);
  });
});

// ============ 辅助函数 ============

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  if (data) {
    res.end(JSON.stringify(data, null, 2));
  } else {
    res.end();
  }
}

// ============ 服务器 ============

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 解析请求体
  try {
    req.body = await parseJSON(req);
  } catch (error) {
    return sendJSON(res, 400, { error: error.message });
  }

  // 将 pathname + search 传给 match，由路由器解析查询参数
  const match = router.match(req.method, url.pathname + url.search);

  if (match) {
    req.params = match.params;
    req.query = match.query;
    try {
      await match.handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      sendJSON(res, 500, { error: '服务器内部错误' });
    }
  } else {
    sendJSON(res, 404, { error: `Cannot ${req.method} ${url.pathname}` });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 增强路由器示例服务器运行在 http://localhost:${PORT}`);
  console.log('可用的 API（路由前缀 /api/v1）:');
  console.log('  GET    /api/v1/todos?page=1&limit=10&completed=false');
  console.log('  GET    /api/v1/todos/:id');
  console.log('  POST   /api/v1/todos');
  console.log('  PUT    /api/v1/todos/:id');
  console.log('  PATCH  /api/v1/todos/:id   ← 部分更新');
  console.log('  DELETE /api/v1/todos/:id');
});
