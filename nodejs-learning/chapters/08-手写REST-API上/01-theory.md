# Day 08 — 手写 REST API（上）· 理论文档

## 核心概念

### 1. 为什么手写？

面试常问："Express 框架的 Router 底层是怎么实现的？"手写之后你能清晰回答：
- 路由匹配 = 正则 + 参数提取
- 中间件 = 函数链 + next()
- 框架 = 路由 + 中间件 + 请求体解析

---

### 2. 路由系统实现

**核心思路：**
1. 路由表 = 数组（按注册顺序匹配）
2. 每条路由 = `{ method, pattern, params, handler }`
3. 路由模式 `/users/:id` → 正则 `/users/([^/]+)` + 参数名 `['id']`

```javascript
class Router {
  constructor() {
    this.routes = [];
  }
  
  // 将路径模式转换为正则表达式
  _pathToRegex(path) {
    const paramNames = [];
    const pattern = path
      .replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');
    
    return { regex: new RegExp(`^${pattern}$`), paramNames };
  }
  
  // 注册路由
  add(method, path, handler) {
    const { regex, paramNames } = this._pathToRegex(path);
    this.routes.push({ method: method.toUpperCase(), regex, paramNames, handler });
  }
  
  // 匹配路由
  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      const match = pathname.match(route.regex);
      if (!match) continue;
      
      // 提取路由参数
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      
      return { handler: route.handler, params };
    }
    return null;
  }
  
  get(path, handler) { this.add('GET', path, handler); }
  post(path, handler) { this.add('POST', path, handler); }
  put(path, handler) { this.add('PUT', path, handler); }
  delete(path, handler) { this.add('DELETE', path, handler); }
  patch(path, handler) { this.add('PATCH', path, handler); }
}
```

---

### 3. 请求体解析

```javascript
// 解析 JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('application/json')) return resolve({});
    
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) { // 防止超大 body（1MB 限制）
        req.destroy(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
```

---

### 4. 完整的迷你框架组装

```javascript
const http = require('http');

function createApp() {
  const router = new Router();
  
  const app = {
    get: router.get.bind(router),
    post: router.post.bind(router),
    put: router.put.bind(router),
    delete: router.delete.bind(router),
    patch: router.patch.bind(router),
    
    listen(port, cb) {
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost`);
        
        // 增强 req
        req.query = Object.fromEntries(url.searchParams);
        try { req.body = await parseJsonBody(req); }
        catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: err.message }));
        }
        
        // 查找路由
        const result = router.match(req.method, url.pathname);
        if (!result) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Not Found' }));
        }
        
        req.params = result.params;
        
        // 简易响应方法
        res.json = (data, status = 200) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        };
        
        try {
          await result.handler(req, res);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });
      
      server.listen(port, cb);
      return server;
    }
  };
  
  return app;
}
```

---

## 面试高频问题

**Q1: Express 的路由匹配是如何实现的？**

答：路由注册时将路径模式（如 `/users/:id`）转换为正则表达式，同时记录参数名。请求到来时，按注册顺序遍历路由表，用正则匹配 pathname，匹配成功则从正则 capture group 中提取参数值。

**Q2: 为什么要限制 request body 的大小？**

答：恶意用户可能发送超大的请求体（如 1GB），导致服务器内存耗尽。限制 body 大小（通常 1MB~10MB）是基本的安全防护。

**Q3: 路由匹配为什么用数组而不是 Map/对象？**

答：路由可能有通配符或参数（如 `/users/:id`），不能直接用路径字符串作为 key 精确匹配，必须逐条正则测试。同时，路由的顺序很重要（先注册的先匹配）。
