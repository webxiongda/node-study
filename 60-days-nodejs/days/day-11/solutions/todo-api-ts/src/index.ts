// Day 11 - 练习 1：TypeScript TODO API
// 将 Day 8-9 的 TODO API 完全用 TypeScript 重写

import http from 'node:http';
import type { EnhancedRequest, EnhancedResponse, Middleware, RouteHandler, Todo } from './types.js';
import { AppError, NotFoundError } from './errors.js';
import { validateCreateTodo, validateUpdateTodo, validateBatchIds } from './validators.js';

// ============ 路由器 ============

class Router {
  private routes: Array<{
    method: string;
    path: string;
    handler: RouteHandler;
  }> = [];

  get(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'GET', path, handler });
  }

  post(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'POST', path, handler });
  }

  put(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'PUT', path, handler });
  }

  patch(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'PATCH', path, handler });
  }

  delete(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'DELETE', path, handler });
  }

  match(
    method: string,
    pathname: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this._matchPath(route.path, pathname);
      if (params !== null) {
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  private _matchPath(
    routePath: string,
    requestPath: string
  ): Record<string, string> | null {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);
    if (routeParts.length !== requestParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < routeParts.length; i++) {
      const rp = routeParts[i]!;
      const reqp = requestParts[i]!;
      if (rp.startsWith(':')) {
        params[rp.slice(1)] = reqp;
      } else if (rp !== reqp) {
        return null;
      }
    }
    return params;
  }
}

// ============ 中间件引擎 ============

class MiddlewareEngine {
  private middlewares: Middleware[] = [];

  use(fn: Middleware): void {
    this.middlewares.push(fn);
  }

  async execute(req: EnhancedRequest, res: EnhancedResponse): Promise<void> {
    let index = 0;
    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) return;
      const middleware = this.middlewares[index++]!;
      await middleware(req, res, next);
    };
    await next();
  }
}

// ============ 中间件：错误处理 ============

function errorHandler(): Middleware {
  return async (req, res, next) => {
    try {
      await next();
    } catch (error) {
      const err = error as AppError;
      console.error('❌ 未捕获的错误:', err.message);
      const statusCode = err.statusCode ?? 500;
      const message = statusCode === 500 ? '服务器内部错误' : err.message;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: message,
        ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
      }));
    }
  };
}

// ============ 中间件：请求日志 ============

function logger(): Middleware {
  return async (req, res, next) => {
    const start = Date.now();
    const { method, url } = req;

    const originalEnd = res.end.bind(res) as typeof res.end;
    res.end = function (this: EnhancedResponse, ...args: Parameters<typeof res.end>) {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const color =
        status >= 500 ? '\x1b[31m' :
        status >= 400 ? '\x1b[33m' :
        status >= 300 ? '\x1b[36m' :
        '\x1b[32m';
      console.log(`${color}${status}\x1b[0m ${method} ${url} — ${duration}ms`);
      return originalEnd(...args);
    } as typeof res.end;

    await next();
  };
}

// ============ 中间件：CORS ============

function cors(): Middleware {
  return async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    await next();
  };
}

// ============ 中间件：JSON 解析 ============

function jsonParser(options: { limit?: number } = {}): Middleware {
  const { limit = 1024 * 1024 } = options;

  return async (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method ?? '')) {
      const contentType = req.headers['content-type'] ?? '';
      if (contentType.includes('application/json')) {
        try {
          req.body = await readBody(req, limit);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: (error as Error).message }));
          return;
        }
      }
    }
    if (req.body === undefined) req.body = {};
    await next();
  };
}

function readBody(req: http.IncomingMessage, limit: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new Error('请求体超出大小限制'));
        return;
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

// ============ 辅助函数 ============

function sendJSON(res: EnhancedResponse, status: number, data?: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  if (data !== undefined) {
    res.end(JSON.stringify(data, null, 2));
  } else {
    res.end();
  }
}

// ============ 数据存储 ============

let todos: Todo[] = [
  { id: 1, title: '学习 Node.js', completed: false, priority: 2, createdAt: new Date().toISOString() },
  { id: 2, title: '学习 TypeScript', completed: false, priority: 3, createdAt: new Date().toISOString() },
  { id: 3, title: '完成项目作业', completed: true, priority: 5, createdAt: new Date().toISOString() },
];
let nextId = 4;

// ============ 应用搭建 ============

const app = new MiddlewareEngine();
const router = new Router();

app.use(errorHandler());
app.use(logger());
app.use(cors());
app.use(jsonParser());

// 路由分发中间件
app.use(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const match = router.match(req.method ?? 'GET', url.pathname);

  if (match) {
    req.params = match.params;
    req.query = Object.fromEntries(url.searchParams);
    await match.handler(req, res);
  } else {
    throw new NotFoundError(`路由 ${req.method} ${url.pathname}`);
  }
});

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
  } = req.query as Record<string, string | undefined>;

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
      const aVal = a[sort as keyof Todo];
      const bVal = b[sort as keyof Todo];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }

  // 4. 分页
  const p = Math.max(1, parseInt(page ?? '1'));
  const l = Math.min(100, Math.max(1, parseInt(limit ?? '10')));
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
  const todo = todos.find((t) => t.id === parseInt(req.params['id'] ?? ''));
  if (!todo) throw new NotFoundError('TODO');
  sendJSON(res, 200, { data: todo });
});

// POST /api/todos — 创建 TODO
router.post('/api/todos', (req, res) => {
  const input = validateCreateTodo(req.body);
  const todo: Todo = {
    id: nextId++,
    title: input.title,
    completed: false,
    priority: Math.min(5, Math.max(1, input.priority ?? 3)),
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  sendJSON(res, 201, { data: todo });
});

// PUT /api/todos/:id — 全量更新 TODO
router.put('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === parseInt(req.params['id'] ?? ''));
  if (index === -1) throw new NotFoundError('TODO');

  const input = validateUpdateTodo(req.body);
  const todo = todos[index]!;

  if (input.title !== undefined) todo.title = input.title;
  if (input.completed !== undefined) todo.completed = input.completed;
  if (input.priority !== undefined) todo.priority = Math.min(5, Math.max(1, input.priority));
  todo.updatedAt = new Date().toISOString();

  sendJSON(res, 200, { data: todo });
});

// PATCH /api/todos/:id — 部分更新 TODO
router.patch('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === parseInt(req.params['id'] ?? ''));
  if (index === -1) throw new NotFoundError('TODO');

  const input = validateUpdateTodo(req.body);
  const todo = todos[index]!;

  if (input.title !== undefined) todo.title = input.title;
  if (input.completed !== undefined) todo.completed = input.completed;
  if (input.priority !== undefined) todo.priority = Math.min(5, Math.max(1, input.priority));
  todo.updatedAt = new Date().toISOString();

  sendJSON(res, 200, { data: todo });
});

// DELETE /api/todos/:id — 删除单个 TODO
router.delete('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === parseInt(req.params['id'] ?? ''));
  if (index === -1) throw new NotFoundError('TODO');
  todos.splice(index, 1);
  sendJSON(res, 204);
});

// DELETE /api/todos — 批量删除
router.delete('/api/todos', (req, res) => {
  const ids = validateBatchIds(req.body);
  const idSet = new Set(ids);
  const before = todos.length;
  todos = todos.filter((t) => !idSet.has(t.id));
  const deleted = before - todos.length;
  sendJSON(res, 200, { deleted });
});

// ============ 启动服务器 ============

const PORT = parseInt(process.env['PORT'] ?? '3000');
const server = http.createServer((req, res) => {
  const enhancedReq = req as EnhancedRequest;
  const enhancedRes = res as EnhancedResponse;
  enhancedReq.params = {};
  enhancedReq.query = {};
  enhancedReq.body = undefined;
  app.execute(enhancedReq, enhancedRes);
});

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
  console.log('开发模式: pnpm dev');
  console.log('构建:     pnpm build');
});
