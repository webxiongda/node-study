# Mini TODO API

一个用原生 Node.js（零依赖）构建的 RESTful TODO API。

## 功能特性

- ✅ 完整的 CRUD 操作
- ✅ 自定义路由器（支持动态参数 `:id`）
- ✅ 中间件体系（Logger / CORS / JSON Parser / Error Handler）
- ✅ 请求验证与自定义错误类
- ✅ 分页、过滤、排序、模糊搜索
- ✅ 批量删除
- ✅ Rate Limiting（每 IP 每分钟 60 次）

## 快速开始

```bash
node src/index.js
# 或开发模式（文件变化自动重启）
node --watch src/index.js
```

## API 文档

### 获取所有 TODO

```
GET /api/todos?page=1&limit=10&completed=false&sort=priority&order=desc&search=学习
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| page | 页码 | 1 |
| limit | 每页条数（最大 100） | 10 |
| completed | 按完成状态过滤（true/false） | — |
| sort | 排序字段（priority / createdAt） | — |
| order | 排序方向（asc / desc） | asc |
| search | 模糊搜索 title | — |

### 获取单个 TODO

```
GET /api/todos/:id
```

### 创建 TODO

```
POST /api/todos
Content-Type: application/json

{
  "title": "学习 Node.js",
  "priority": 3
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 不超过 200 字符 |
| priority | number | — | 1-5，默认 3 |

### 更新 TODO（全量）

```
PUT /api/todos/:id
Content-Type: application/json

{
  "title": "学习 Express",
  "completed": true,
  "priority": 5
}
```

### 更新 TODO（部分）

```
PATCH /api/todos/:id
Content-Type: application/json

{ "completed": true }
```

### 删除单个 TODO

```
DELETE /api/todos/:id
```

### 批量删除

```
DELETE /api/todos
Content-Type: application/json

{ "ids": [1, 2, 3] }
```

## 架构说明

```
src/
├── index.js          # 入口：组装中间件和路由，启动 HTTP 服务
├── router.js         # Router：注册路由、:param 路径匹配
├── middleware.js     # MiddlewareEngine：use() + execute()，驱动中间件链
├── routes/
│   └── todos.js      # TODO 路由处理函数（所有业务逻辑）
├── middlewares/
│   ├── logger.js     # 请求日志（劫持 res.end 获取状态码）
│   ├── cors.js       # CORS 响应头 + OPTIONS 预检
│   ├── json-parser.js # 读取 Stream，解析 JSON 请求体
│   ├── error-handler.js # try/catch 包裹 next()，统一错误响应
│   └── rate-limiter.js  # IP 维度的滑动窗口限流
├── errors/
│   └── app-error.js  # AppError / NotFoundError / ValidationError
└── utils/
    └── response.js   # sendJSON 工具函数
```

**中间件执行顺序**：
```
请求 → errorHandler → logger → cors → rateLimiter → jsonParser → 路由调度 → handler → 响应
```

`errorHandler` 放在最外层，通过 `try/catch` 包裹后续所有 `next()` 调用，从而捕获整个链路中 throw 出的任何错误。

## 测试示例

```bash
# 创建
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"学习 Node.js","priority":5}'

# 查询（分页 + 排序）
curl "http://localhost:3000/api/todos?page=1&limit=5&sort=priority&order=desc"

# 搜索
curl "http://localhost:3000/api/todos?search=学习"

# 标记完成
curl -X PATCH http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# 删除
curl -X DELETE http://localhost:3000/api/todos/1

# 批量删除
curl -X DELETE http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"ids":[2,3]}'
```

## 学到了什么

- **中间件模式**：本质是函数组合，每个函数通过 `next()` 把控制权传递给下一个。顺序决定行为——`errorHandler` 在最外层才能兜住所有错误。
- **路由匹配**：把路径按 `/` 分段，逐段比对，遇到 `:param` 就提取参数，本质是一个简单的树状前缀匹配的平铺版本。
- **Stream 解析**：HTTP 请求体是 Stream，必须监听 `data` 事件收集 chunk，在 `end` 事件里拼合、解析。这是理解 Node.js I/O 的关键。
- **错误分层**：业务错误（`AppError`）和系统错误要区别对待——业务错误直接返回给客户端，系统错误只暴露通用信息并在服务端打印堆栈。
