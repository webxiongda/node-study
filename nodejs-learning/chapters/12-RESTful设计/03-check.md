# Day 12 — 验收自测题

---

### 题 1（概念题）
以下 URL 设计有什么问题？如何改进？

```
POST /api/getUserById
POST /api/deletePost?id=5
GET  /api/userPosts?userId=1
POST /api/v1/user/create
```

---

### 题 2（概念题）
offset 分页和 cursor 分页各有什么优缺点？各适合什么场景？

---

### 题 3（实操题）
设计一个电商系统的订单相关 API（URL + HTTP 方法），包含：订单列表、创建订单、获取单个订单、取消订单、获取订单中的商品列表。

---

### 题 4（概念题）
API 版本化有哪几种方式？推荐哪种？为什么？

---

### 题 5（项目应用题）
设计一个统一的 API 错误响应格式，要求：包含错误码（code）、可读消息（message）、可选的字段级错误（fields）。写出 JSON 示例。

---

## 参考答案

### 题 1
- `POST /api/getUserById` → `GET /api/users/:id`（用 GET，动词改名词）
- `POST /api/deletePost?id=5` → `DELETE /api/posts/5`（用 DELETE，ID 放路径）
- `GET /api/userPosts?userId=1` → `GET /api/users/1/posts`（用嵌套资源）
- `POST /api/v1/user/create` → `POST /api/v1/users`（用复数，去掉动词）

### 题 2
**offset 分页（page/limit）：**
- 优点：实现简单，支持跳页（"跳到第 50 页"）
- 缺点：大 OFFSET 时 DB 性能差；数据变动时可能重复或跳过记录
- 适合：后台管理系统（需要跳页）、数据量小

**cursor 分页（after=lastId）：**
- 优点：性能恒定（用索引），不受数据变动影响
- 缺点：无法跳页，只能"下一页"
- 适合：前端无限滚动、Feed 流、大数据量

### 题 3
```
GET    /orders              — 订单列表（?status=pending&page=1）
POST   /orders              — 创建订单
GET    /orders/:id          — 获取单个订单
PATCH  /orders/:id/cancel   — 取消订单（动作用子资源表示）
                              或 PATCH /orders/:id with { status: 'cancelled' }
GET    /orders/:id/items    — 订单中的商品列表
```

取消订单：`PATCH /orders/:id` + body `{ status: 'cancelled' }` 更 RESTful；`/orders/:id/cancel` 也可接受（动作子资源）。

### 题 4
三种：URL 路径（`/v1/`）、请求头（`Accept: vnd.api+json; version=1`）、查询参数（`?version=1`）。

推荐 **URL 路径**：最直观，浏览器/curl 可直接测试，便于文档写作，不依赖 HTTP 客户端设置自定义头。

### 题 5
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数不合法",
    "fields": [
      { "field": "email", "message": "邮箱格式不正确" },
      { "field": "password", "message": "密码至少8位" }
    ]
  }
}
```
字段级错误用于表单验证，让前端能准确显示在对应输入框旁边。
