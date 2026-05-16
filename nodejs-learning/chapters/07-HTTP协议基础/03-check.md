# Day 07 — 验收自测题

---

### 题 1（概念题）
PUT 和 PATCH 有什么区别？什么情况下应该用 PATCH 而不是 PUT？

---

### 题 2（概念题）
以下场景应该返回什么状态码？

a) 用户注册成功，返回新用户信息  
b) 删除文章成功，不返回任何数据  
c) 请求的用户 ID 不存在  
d) Token 已过期  
e) 用户已登录，但没有管理员权限  
f) 注册时用户名已被占用  

---

### 题 3（实操题）
什么情况下浏览器会发送 OPTIONS 预检请求？以下哪些请求会触发预检？

a) `fetch('https://api.example.com', { method: 'GET' })`  
b) `fetch('https://api.example.com/users', { method: 'DELETE' })`  
c) `fetch('https://api.example.com/login', { method: 'POST', headers: { 'Content-Type': 'application/json' } })`  
d) `fetch('https://api.example.com', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })`  

---

### 题 4（实操题）
用原生 `node:http` 写一个服务器，响应 `GET /time` 返回 `{ "time": "2026-05-16T10:00:00.000Z" }`，其他路由返回 404。

---

### 题 5（项目应用题）
你的前端在 `localhost:3000`，后端 API 在 `localhost:8080`。前端用 `fetch` 调用 API，请求头包含 `Authorization: Bearer xxx`。描述：
1. 浏览器会发出什么请求？
2. 后端需要返回哪些响应头？

---

## 参考答案

### 题 1
PUT = 替换整个资源（客户端发送完整对象，没发的字段会被清空/设为默认值）。
PATCH = 部分更新（只发要改的字段）。

**用 PATCH 的场景**：更新用户的某一个字段（如只改头像 URL），不需要也不应该把整个用户对象重发一遍（浪费带宽，且可能覆盖其他客户端的并发更新）。

### 题 2
a) **201 Created**（资源创建成功，`Location` 头指向新资源 URL）  
b) **204 No Content**（操作成功，无响应体）  
c) **404 Not Found**  
d) **401 Unauthorized**（token 失效 = 认证失败）  
e) **403 Forbidden**  
f) **409 Conflict**（资源冲突）  

### 题 3
**会触发预检的：b、c**
- a：GET 请求，简单请求，不预检
- b：DELETE 方法，非简单，触发预检
- c：POST + `Content-Type: application/json`，非简单请求头，触发预检
- d：POST + `application/x-www-form-urlencoded`，简单请求，不预检

### 题 4
```javascript
const http = require('http');
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url === '/time') {
    res.writeHead(200);
    res.end(JSON.stringify({ time: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
}).listen(3000);
```

### 题 5
1. 因为跨域 + `Authorization` 自定义头，浏览器先发 `OPTIONS http://localhost:8080/...` 预检请求；预检通过后，再发真实的请求。

2. 后端需要返回：
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```
如果还要带 Cookie 需要额外加 `Access-Control-Allow-Credentials: true`，且 `Origin` 不能是 `*`。
