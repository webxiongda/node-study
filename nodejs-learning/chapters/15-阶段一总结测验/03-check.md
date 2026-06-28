# Day 15 — 阶段一综合测验

> 不看任何文档，独立作答。这些是面试中最常出现的题目。

---

## 第一部分：事件循环顺序（必考）

### 题 1
输出顺序？

```javascript
setTimeout(() => console.log('A'), 0);
Promise.resolve().then(() => console.log('B'));
process.nextTick(() => console.log('C'));
console.log('D');
setImmediate(() => console.log('E'));
```

---

### 题 2
在 `fs.readFile` 回调内，`setTimeout(fn, 0)` 和 `setImmediate(fn)` 谁先执行？

---

## 第二部分：异步编程

### 题 3
以下代码有什么 bug？修复它：

```javascript
async function sendEmails(users) {
  users.forEach(async user => {
    await sendEmail(user.email);
    console.log(`发送给 ${user.email}`);
  });
  console.log('全部发送完毕');
}
```

---

### 题 4
实现 `Promise.all`（简化版）：

```javascript
function myAll(promises) {
  // 实现
}
```

---

## 第三部分：HTTP / REST

### 题 5
以下场景应该用哪个 HTTP 方法和状态码？

a) 用户登录成功  
b) 创建一篇文章  
c) 只更新文章的标题  
d) 删除文章成功  
e) 要求登录才能访问，但用户没有带 Token  

---

## 第四部分：中间件 / 架构

### 题 6
Express 中间件和 Koa 中间件最本质的区别是什么？

---

### 题 7
路由注册顺序：以下两个路由，请求 `/users/admin` 会匹配哪个？如何修复？

```javascript
router.get('/users/:id', getUser);
router.get('/users/admin', getAdmin);
```

---

## 参考答案

### 题 1：D → C → B → E → A（setImmediate 和 setTimeout 在非 I/O 环境顺序不保证，但通常 E 在 A 前）

### 题 2：setImmediate 先（poll → check → timers 的顺序）

### 题 3
bug：`forEach` 不等待 async 回调，"全部发送完毕"会在所有邮件发送前打印。

```javascript
async function sendEmails(users) {
  await Promise.all(users.map(async user => {
    await sendEmail(user.email);
    console.log(`发送给 ${user.email}`);
  }));
  console.log('全部发送完毕');
}
```

### 题 4
```javascript
function myAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = promises.length;
    if (remaining === 0) return resolve([]);
    
    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {
        results[i] = val;
        if (--remaining === 0) resolve(results);
      }).catch(reject);
    });
  });
}
```

### 题 5
a) `POST /auth/login` → **200**（不是创建资源，是验证）  
b) `POST /posts` → **201 Created**  
c) `PATCH /posts/:id` → **200**  
d) `DELETE /posts/:id` → **204 No Content**  
e) → **401 Unauthorized**  

### 题 6
Express 线性单向（next 只能向前）；Koa 洋葱双向（await next() 前后都能执行，响应阶段可以修改 ctx）。

### 题 7
匹配 **getUser**（`:id = 'admin'`），因为先注册的先匹配。
修复：精确路由先注册：
```javascript
router.get('/users/admin', getAdmin);  // 先注册精确路由
router.get('/users/:id', getUser);
```
