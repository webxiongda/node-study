# Day 12 — 实操 Demo

## Demo：博客系统 API 设计（URL 规范示例）

```
# 用户
GET    /api/v1/users                    — 用户列表（管理员）
GET    /api/v1/users/:id                — 用户详情
GET    /api/v1/users/me                 — 当前用户（精确路由先注册！）
PATCH  /api/v1/users/me                 — 更新个人信息

# 文章
GET    /api/v1/posts                    — 文章列表（?page=1&limit=10&tag=nodejs）
POST   /api/v1/posts                    — 创建文章
GET    /api/v1/posts/:id                — 文章详情
PUT    /api/v1/posts/:id                — 替换文章
PATCH  /api/v1/posts/:id                — 更新文章
DELETE /api/v1/posts/:id                — 删除文章

# 嵌套资源：文章的评论
GET    /api/v1/posts/:postId/comments   — 文章评论列表
POST   /api/v1/posts/:postId/comments   — 添加评论
DELETE /api/v1/posts/:postId/comments/:id — 删除评论

# 用户的文章（过滤形式）
GET    /api/v1/users/:userId/posts      — 某用户的文章列表
```

## 统一响应格式实现

```javascript
// 响应工具函数
const respond = {
  success(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data }));
  },
  created(res, data) {
    this.success(res, data, 201);
  },
  paginated(res, data, pagination) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data, pagination }));
  },
  error(res, message, status = 500, code = 'ERROR') {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code, message } }));
  },
  noContent(res) {
    res.writeHead(204); res.end();
  }
};

// 使用
router.get('/posts', (req, res) => {
  const { page = '1', limit = '10' } = req.query;
  const posts = getPosts();
  const p = parseInt(page), l = Math.min(parseInt(limit), 100);
  const total = posts.length;
  respond.paginated(res, posts.slice((p-1)*l, p*l), {
    page: p, limit: l, total, totalPages: Math.ceil(total/l)
  });
});
```
