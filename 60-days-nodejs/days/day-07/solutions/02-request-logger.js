// Day 07 - 练习 2：HTTP 请求日志中间件

import http from 'node:http';

// ========== 工具函数 ==========

function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatTimestamp(date) {
  // 输出格式：2024-01-15T10:30:00（不含毫秒）
  return date.toISOString().replace(/\.\d{3}Z$/, '');
}

// ========== 日志中间件 ==========

/**
 * 请求日志中间件
 * 包装原始 handler，记录每个请求的方法、URL、状态码、
 * 响应时间、请求体大小和响应体大小。
 *
 * 输出格式：[2024-01-15T10:30:00] GET /api/users 200 45ms 0B → 1.2KB
 */
function withLogger(handler) {
  return (req, res) => {
    const start = Date.now();

    // 追踪请求体大小
    let reqBodySize = 0;
    req.on('data', (chunk) => {
      reqBodySize += chunk.length;
    });

    // 拦截 res.write 和 res.end 以追踪响应体大小
    let resBodySize = 0;
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = (chunk, ...args) => {
      if (chunk) {
        resBodySize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      return originalWrite(chunk, ...args);
    };

    res.end = (chunk, ...args) => {
      if (chunk) {
        resBodySize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      const duration = Date.now() - start;
      const timestamp = formatTimestamp(new Date());
      console.log(
        `[${timestamp}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms ${formatBytes(reqBodySize)} → ${formatBytes(resBodySize)}`
      );
      return originalEnd(chunk, ...args);
    };

    handler(req, res);
  };
}

// ========== 演示服务器 ==========

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

const handler = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Welcome to the API', timestamp: new Date().toISOString() }));

  } else if (url.pathname === '/api/users' && req.method === 'GET') {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));

  } else if (url.pathname === '/api/users' && req.method === 'POST') {
    const body = await parseBody(req);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User created', data: body }));

  } else if (url.pathname === '/api/users' && req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));

  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
};

const server = http.createServer(withLogger(handler));

server.listen(3000, () => {
  console.log('🚀 服务器运行在 http://localhost:3000');
  console.log('');
  console.log('测试接口:');
  console.log('  curl http://localhost:3000/');
  console.log('  curl http://localhost:3000/api/users');
  console.log('  curl -X POST -H "Content-Type: application/json" -d \'{"name":"Dave"}\' http://localhost:3000/api/users');
  console.log('  curl http://localhost:3000/api/unknown');
});
