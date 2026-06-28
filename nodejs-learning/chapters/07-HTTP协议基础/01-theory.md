# Day 07 — HTTP 协议基础 · 理论文档

## 核心概念

### 1. HTTP 方法语义（面试必考）

| 方法 | 语义 | 幂等？ | 安全？ | 有请求体？ |
|------|------|-------|--------|----------|
| GET | 获取资源 | ✅ | ✅ | 通常没有 |
| POST | 创建资源 | ❌ | ❌ | ✅ |
| PUT | 替换整个资源 | ✅ | ❌ | ✅ |
| PATCH | 部分更新资源 | ❌（通常）| ❌ | ✅ |
| DELETE | 删除资源 | ✅ | ❌ | 通常没有 |
| HEAD | 只获取响应头 | ✅ | ✅ | ❌ |
| OPTIONS | 查询支持的方法（CORS 预检）| ✅ | ✅ | ❌ |

**幂等（Idempotent）**：多次相同请求结果一致（GET 100次和 GET 1次结果相同）。
**安全（Safe）**：不修改服务器状态（只读操作）。

**PUT vs PATCH（面试常考）：**
- `PUT /users/1` 发送完整用户对象 → 替换整个用户（没发的字段会清空）
- `PATCH /users/1` 发送 `{ "name": "Alice" }` → 只更新 name，其他字段不变

---

### 2. 状态码（必背）

**2xx 成功：**
| 状态码 | 含义 | 使用场景 |
|-------|------|---------|
| 200 OK | 请求成功 | GET 成功返回数据 |
| 201 Created | 创建成功 | POST 创建资源成功 |
| 204 No Content | 成功但无响应体 | DELETE 成功 |

**3xx 重定向：**
| 状态码 | 含义 | 使用场景 |
|-------|------|---------|
| 301 | 永久重定向 | 旧 URL 永久迁移 |
| 302 | 临时重定向 | 登录后跳转 |
| 304 Not Modified | 缓存未过期 | 浏览器缓存协商 |

**4xx 客户端错误：**
| 状态码 | 含义 | 使用场景 |
|-------|------|---------|
| 400 Bad Request | 请求参数错误 | 缺少必填字段、格式错误 |
| 401 Unauthorized | 未认证 | 没登录或 token 失效 |
| 403 Forbidden | 无权限 | 已登录但没有权限 |
| 404 Not Found | 资源不存在 | 找不到 id 对应的资源 |
| 409 Conflict | 冲突 | 用户名已存在 |
| 422 Unprocessable Entity | 语义错误 | 字段格式正确但业务校验失败 |
| 429 Too Many Requests | 超过限流 | Rate Limit |

**5xx 服务端错误：**
| 状态码 | 含义 |
|-------|------|
| 500 Internal Server Error | 服务器未处理的异常 |
| 502 Bad Gateway | 上游服务返回无效响应 |
| 503 Service Unavailable | 服务暂时不可用（过载或维护）|

**401 vs 403（面试常考）：**
- 401：你是谁我不知道（需要先登录）
- 403：我知道你是谁，但你没权限（拒绝访问）

---

### 3. 常用请求头和响应头

**请求头：**
```
Authorization: Bearer <token>          # 认证令牌
Content-Type: application/json         # 请求体格式
Accept: application/json               # 期望的响应格式
X-Request-ID: uuid                     # 请求追踪 ID
```

**响应头：**
```
Content-Type: application/json; charset=utf-8
Cache-Control: max-age=3600, public    # 缓存控制
ETag: "abc123"                         # 资源版本标识
Location: /api/users/123               # 创建后的资源 URL
X-RateLimit-Remaining: 98              # 剩余请求次数
```

---

### 4. CORS（跨域资源共享）— 面试高频

**为什么有 CORS？**
浏览器的同源策略（Same-Origin Policy）阻止从一个源（协议+域名+端口）发送请求到另一个源。

**简单请求 vs 预检请求：**

简单请求（直接发送，服务端加响应头即可）条件：
- 方法是 GET/HEAD/POST 之一
- 请求头只有 `Accept`、`Content-Type`（仅 `application/x-www-form-urlencoded` 等）等有限几种

预检请求（先发 OPTIONS，再发真实请求）触发条件：
- 使用了 PUT/DELETE/PATCH
- `Content-Type: application/json`
- 自定义请求头（如 `Authorization`）

**服务端需要返回的 CORS 响应头：**
```
Access-Control-Allow-Origin: https://frontend.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400          # 预检结果缓存时间
Access-Control-Allow-Credentials: true # 允许携带 Cookie
```

---

### 5. 用 node:http 创建服务器

```javascript
const http = require('http');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // 设置响应头
  res.setHeader('Content-Type', 'application/json');
  
  // 路由
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  // 解析 POST 请求体
  if (req.method === 'POST') {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    console.log('收到 body:', body);
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(3000, () => console.log('Server running on :3000'));
```

---

## 面试高频问题

**Q1: GET 和 POST 的区别？**

答：语义上 GET 是获取，POST 是提交数据。技术上：GET 参数在 URL（可缓存、可收藏），POST 在请求体（不缓存）。GET 是幂等的，POST 不是。

**Q2: 401 和 403 的区别？**

答：401 = 未认证（没带 token 或 token 过期），需要先登录；403 = 未授权（已登录，但没有权限），拒绝访问。

**Q3: 什么情况下会触发 CORS 预检请求？**

答：非简单请求时：使用了 PUT/DELETE/PATCH，或请求头包含 `Authorization`/`Content-Type: application/json` 等。浏览器先发 OPTIONS 请求询问服务器是否允许，服务器返回 `Access-Control-Allow-*` 头后，再发真实请求。

**Q4: 204 和 200 的区别？什么时候用 204？**

答：204 表示成功但没有响应体（如 DELETE 成功后），浏览器不会尝试解析响应体。
