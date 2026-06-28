// Day 10 - 入口文件

import http from 'node:http';
import { Router } from './router.js';
import { MiddlewareEngine } from './middleware.js';
import { logger } from './middlewares/logger.js';
import { cors } from './middlewares/cors.js';
import { jsonParser } from './middlewares/json-parser.js';
import { errorHandler } from './middlewares/error-handler.js';
import { rateLimiter } from './middlewares/rate-limiter.js';
import { registerTodoRoutes } from './routes/todos.js';
import { NotFoundError } from './errors/app-error.js';

// ──────────────────────────────────────────
// 初始化
// ──────────────────────────────────────────
const app = new MiddlewareEngine();
const router = new Router();

// 注册所有路由
registerTodoRoutes(router);

// ──────────────────────────────────────────
// 注册中间件（顺序很重要！）
// ──────────────────────────────────────────
app.use(errorHandler());                            // 最外层，捕获所有未处理错误
app.use(logger());                                  // 请求日志
app.use(cors());                                    // CORS
app.use(rateLimiter({ windowMs: 60_000, max: 60 })); // 每 IP 每分钟 60 次
app.use(jsonParser());                              // JSON 请求体解析

// 路由调度：必须放在所有通用中间件之后
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

// ──────────────────────────────────────────
// 启动服务器
// ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => app.execute(req, res));

server.listen(PORT, () => {
  console.log(`🚀 Mini TODO API 运行在 http://localhost:${PORT}`);
  console.log('');
  console.log('可用的 API:');
  console.log('  GET    /api/todos            获取所有（支持分页/过滤/排序/搜索）');
  console.log('  GET    /api/todos/:id        获取单个 TODO');
  console.log('  POST   /api/todos            创建 TODO');
  console.log('  PUT    /api/todos/:id        全量更新 TODO');
  console.log('  PATCH  /api/todos/:id        部分更新 TODO');
  console.log('  DELETE /api/todos/:id        删除单个 TODO');
  console.log('  DELETE /api/todos            批量删除（body: { ids: number[] }）');
});
