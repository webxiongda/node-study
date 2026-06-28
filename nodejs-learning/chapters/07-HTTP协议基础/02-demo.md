# Day 07 — 实操 Demo

## Demo 1：原生 HTTP 服务器

```javascript
const http = require('http');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const parsedUrl = new URL(url, `http://localhost`);
  
  res.setHeader('Content-Type', 'application/json');
  
  // 简单路由
  if (method === 'GET' && parsedUrl.pathname === '/') {
    res.writeHead(200);
    return res.end(JSON.stringify({ message: 'Hello HTTP!' }));
  }
  
  if (method === 'POST' && parsedUrl.pathname === '/echo') {
    const body = await parseBody(req);
    res.writeHead(200);
    return res.end(JSON.stringify({ received: body }));
  }
  
  if (method === 'GET' && parsedUrl.pathname === '/query') {
    const name = parsedUrl.searchParams.get('name') ?? 'World';
    res.writeHead(200);
    return res.end(JSON.stringify({ greeting: `Hello, ${name}!` }));
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(3000, () => console.log('http://localhost:3000'));
```

**测试：**
```bash
curl http://localhost:3000/
curl http://localhost:3000/query?name=Alice
curl -X POST -H "Content-Type: application/json" -d '{"msg":"hi"}' http://localhost:3000/echo
```

---

## Demo 2：CORS 中间件

```javascript
function corsMiddleware(req, res, options = {}) {
  const {
    origin = '*',
    methods = 'GET,POST,PUT,DELETE,OPTIONS',
    headers = 'Content-Type,Authorization',
    maxAge = 86400,
  } = options;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
  res.setHeader('Access-Control-Max-Age', String(maxAge));

  // 预检请求直接返回 204
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true; // 表示已处理
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  if (corsMiddleware(req, res, { origin: 'http://localhost:5173' })) return;
  
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({ data: 'works with CORS!' }));
});
```
