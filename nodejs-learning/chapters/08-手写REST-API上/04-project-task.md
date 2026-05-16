# Day 08 — 项目任务：增强路由器

## 业务背景

你正在开发一个内部工具框架，需要一个比 Demo 更完善的路由器，支持查询参数解析、路由分组（prefix）、多个 handler（路由级中间件）。

## 技术要求

不安装第三方包，纯 Node.js。

## API 设计

```javascript
const router = new Router();

// 基础用法
router.get('/health', (req, res) => res.json({ ok: true }));
router.post('/users', validateBody, createUser);  // 多个 handler

// 路由分组（前缀）
const apiRouter = new Router('/api/v1');
apiRouter.get('/users', listUsers);
apiRouter.get('/users/:id', getUser);
router.use(apiRouter);  // 挂载子路由器

// 自动解析查询参数
// GET /users?page=2&limit=10
// req.query = { page: '2', limit: '10' }
```

## 验收标准

- [ ] 支持路由分组（`new Router('/api/v1')` + `router.use(subRouter)`）
- [ ] 支持单个路由注册多个 handler（链式中间件）
- [ ] 匹配时正确提取 `req.params`、`req.query`
- [ ] 未匹配的路由返回 404
- [ ] 完整测试：至少测试带参数路由、精确路由优先、路由分组

## 常见坑

1. **路由分组的拼接**：子路由的 prefix 要和每条路由的 path 拼接，但不要双斜杠（`/api/v1` + `/users` = `/api/v1/users` 不是 `/api/v1//users`）。
2. **多 handler 链式调用**：参考中间件模式（Day 09），每个 handler 调用 `next()` 才进入下一个。
3. **`PATCH /api/v1/users/me`**：要注意精确路由在参数路由之前注册。
