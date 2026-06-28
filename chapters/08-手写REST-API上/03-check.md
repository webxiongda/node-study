# Day 08 — 验收自测题

---

### 题 1（概念题）
路由模式 `/users/:id/posts/:postId` 应该转换成什么正则表达式？提取的参数名是什么？

---

### 题 2（实操题）
实现一个 `_pathToRegex(path)` 函数，输入路径模式，返回 `{ regex, paramNames }`。

---

### 题 3（实操题）
以下路由注册顺序，`GET /users/me` 会匹配哪个 handler？

```javascript
router.get('/users/:id', handlerA);
router.get('/users/me', handlerB);
```

如何修复？

---

### 题 4（概念题）
为什么需要限制 request body 大小？一般限制多大？

---

### 题 5（项目应用题）
设计一个博客系统的路由表（不用实现 handler），要求支持：
文章的 CRUD、获取某用户的所有文章、文章的评论列表。

---

## 参考答案

### 题 1
正则：`/^\/users\/([^/]+)\/posts\/([^/]+)$/`  
参数名：`['id', 'postId']`

匹配 `/users/123/posts/456` 时，`id='123'`，`postId='456'`。

### 题 2
```javascript
function pathToRegex(path) {
  const paramNames = [];
  const pattern = path
    .replace(/\//g, '\\/')
    .replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  return { regex: new RegExp('^' + pattern + '$'), paramNames };
}
```

### 题 3
`GET /users/me` 会匹配 **handlerA**（`:id` 的值为 `'me'`），因为路由按注册顺序匹配，`/users/:id` 先注册。

修复：把精确路由放在参数路由之前：
```javascript
router.get('/users/me', handlerB);   // 精确路由先注册
router.get('/users/:id', handlerA);  // 参数路由后注册
```

### 题 4
不限制大小的话，恶意用户可以发送无限大的请求体（如 10GB），服务器会持续读取并存在内存中，导致 OOM 崩溃。一般限制 1MB~10MB（API 接口通常 1MB，文件上传接口另设更大的限制）。

### 题 5
```
GET    /posts              — 获取文章列表
POST   /posts              — 创建文章
GET    /posts/:id          — 获取单篇文章
PUT    /posts/:id          — 替换文章
PATCH  /posts/:id          — 更新文章部分字段
DELETE /posts/:id          — 删除文章

GET    /users/:userId/posts — 获取某用户的所有文章

GET    /posts/:postId/comments       — 获取文章评论列表
POST   /posts/:postId/comments       — 添加评论
DELETE /posts/:postId/comments/:id   — 删除评论
```
