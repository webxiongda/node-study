# Day 12 — RESTful API 设计原则 · 理论文档

## 核心概念

### 1. REST 的核心思想：面向资源

REST（Representational State Transfer）的核心：**用名词描述资源，用 HTTP 方法描述操作**。

```
❌ 动词 URL（RPC 风格）：
POST /getUser
POST /createUser
POST /deleteUser

✅ 名词 URL（REST 风格）：
GET    /users      — 获取列表
POST   /users      — 创建
GET    /users/:id  — 获取单个
PUT    /users/:id  — 替换
PATCH  /users/:id  — 更新
DELETE /users/:id  — 删除
```

---

### 2. URL 命名规范

| 规范 | ❌ 错误 | ✅ 正确 |
|------|---------|---------|
| 用复数名词 | `/user` | `/users` |
| 用小写 + 连字符 | `/userPosts` | `/user-posts` |
| 不用动词 | `/getUsers` | `/users` |
| 嵌套资源有层级 | `/user-posts?userId=1` | `/users/1/posts` |
| 嵌套层级不超过3 | `/a/b/c/d/e` | `/a/b/c` |

**嵌套资源的建议：**
```
/users/1/posts         — 用户1的所有文章  ✅
/users/1/posts/5       — 用户1的第5篇文章  ✅
/users/1/posts/5/comments  — 最多3层  ✅
/posts/5/comments      — 如果评论有自己的 ID，可以直接 /comments/:id  ✅
```

---

### 3. 统一响应格式（面试考点）

```javascript
// 成功响应
{
  "data": { ... },       // 实际数据
  "message": "Success"   // 可选
}

// 列表响应
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5
  }
}

// 错误响应
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "details": [...]      // 可选，字段级错误
  }
}
```

**错误响应不要暴露：**
- Stack trace（生产环境）
- 数据库内部错误信息
- 用户不需要知道的内部实现

---

### 4. 查询参数设计

```
分页：?page=1&limit=10
排序：?sort=createdAt&order=desc  （或 ?sort=-createdAt 负号表示倒序）
过滤：?status=active&role=admin
搜索：?q=keyword  或 ?search=keyword
日期范围：?from=2026-01-01&to=2026-12-31
字段选择：?fields=id,name,email  （减少响应体积）
```

---

### 5. API 版本化策略（三种方式）

| 方式 | 示例 | 优劣 |
|------|------|------|
| URL 路径（推荐）| `/api/v1/users` | 最直观，便于测试；URL 不"纯净" |
| 请求头 | `Accept: application/vnd.api+json; version=1` | URL 纯净；调试不方便 |
| 查询参数 | `/api/users?version=1` | 便于测试；不推荐（版本不应该是参数）|

---

## 面试高频问题

**Q1: REST 和 RPC 的区别？**

答：REST 面向资源（名词），用 HTTP 方法语义，无状态，以 URL + 方法描述操作；RPC 面向过程（动词），像函数调用，通常 POST 一切。REST 更适合公开 API，RPC（如 gRPC、tRPC）更适合微服务内部通信（强类型、性能更好）。

**Q2: 为什么 REST API 要返回统一的响应格式？**

答：前端可以有统一的响应处理逻辑（如统一的 loading/error 处理），无需针对每个接口单独处理格式差异。错误响应也能统一被拦截器处理。

**Q3: 分页用 offset 还是 cursor？**

答：
- offset 分页（page/limit）：实现简单，支持跳页，但大数据量下性能差（OFFSET 100000 很慢）
- cursor 分页（after=lastId）：性能恒定，适合无限滚动，但不支持跳页

API 接口用 cursor，后台管理用 offset。
