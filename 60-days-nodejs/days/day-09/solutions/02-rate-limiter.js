// Day 09 - 练习 2：请求限流中间件（Rate Limiter）

import http from 'node:http';

// ============ 限流中间件 ============

/**
 * 基于内存的 IP 限流中间件
 * @param {object} options
 * @param {number} options.windowMs  - 时间窗口（毫秒），默认 60000（1 分钟）
 * @param {number} options.max       - 窗口内最大请求数，默认 60
 */
function rateLimiter(options = {}) {
  const { windowMs = 60 * 1000, max = 60 } = options;

  // Map<ip, { count: number, resetAt: number }>
  const store = new Map();

  // 定期清理过期记录，防止内存泄漏
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store) {
      if (now >= record.resetAt) {
        store.delete(ip);
      }
    }
  }, windowMs);

  // 允许 Node.js 在没有其他任务时退出
  if (cleanup.unref) cleanup.unref();

  return async (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    let record = store.get(ip);

    // 窗口过期或首次请求：重置计数
    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      store.set(ip, record);
    }

    record.count++;

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

    // 写入限流响应头
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    // 超出限制
    if (record.count > max) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(resetSeconds),
      });
      res.end(JSON.stringify({
        error: '请求过于频繁，请稍后再试',
        retryAfter: resetSeconds,
      }));
      return;
    }

    await next();
  };
}

// ============ 简易中间件引擎 ============

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
    try {
      await next();
    } catch (error) {
      console.error('服务器错误:', error.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '服务器内部错误' }));
      }
    }
  }
}

// ============ 应用搭建 ============

const app = new MiddlewareEngine();

// 挂载限流中间件：1 分钟内同一 IP 最多 10 次（演示用，正式可改为 60）
app.use(rateLimiter({ windowMs: 60 * 1000, max: 10 }));

// 示例业务路由
app.use(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/ping' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'pong', time: new Date().toISOString() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: '路由不存在' }));
});

// ============ 启动服务器 ============

const PORT = process.env.PORT || 3001;
const server = http.createServer((req, res) => app.execute(req, res));

server.listen(PORT, () => {
  console.log(`🚀 限流演示服务器运行在 http://localhost:${PORT}`);
  console.log('');
  console.log('限流配置: 每个 IP 每分钟最多 10 次请求（演示值）');
  console.log('');
  console.log('测试方法（连续发送请求，超过 10 次后将收到 429）:');
  console.log(`  for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\\n" http://localhost:${PORT}/api/ping; done`);
  console.log('');
  console.log('查看限流响应头:');
  console.log(`  curl -i http://localhost:${PORT}/api/ping`);
  console.log('  # 注意响应头中的 X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset');
});
