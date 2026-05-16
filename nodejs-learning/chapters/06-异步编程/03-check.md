# Day 06 — 验收自测题

---

### 题 1（概念题）
`Promise.all`、`Promise.allSettled`、`Promise.race`、`Promise.any` 分别适合什么场景？各举一个实际例子。

---

### 题 2（实操题）
以下代码的问题在哪里？修复它，使三个请求并发执行：

```javascript
async function loadDashboard(userId) {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(userId);
  const notifications = await fetchNotifications(userId);
  return { user, orders, notifications };
}
```

---

### 题 3（实操题）
`forEach + async` 的经典陷阱，以下代码的输出是什么？为什么？

```javascript
const items = [1, 2, 3];

async function processItem(n) {
  await new Promise(r => setTimeout(r, 100));
  return n * 2;
}

async function main() {
  const results = [];
  items.forEach(async item => {
    const result = await processItem(item);
    results.push(result);
  });
  console.log('results:', results); // ???
}

main();
```

---

### 题 4（实操题）
实现一个 `withTimeout(promise, ms)` 函数，如果 promise 在 ms 内没有 resolve，就 reject 一个超时错误：

---

### 题 5（项目应用题）
你需要给 1000 个用户发邮件，每次最多 10 个并发（避免超出邮件服务的 rate limit）。
写出关键代码（可以用 asyncPool 或自己实现）。

---

## 参考答案

### 题 1
- `Promise.all`：并行获取用户信息、订单、通知（三个都要成功才渲染页面）
- `Promise.allSettled`：批量发邮件（每个邮件结果都要记录，不能因为一个失败停止其他）
- `Promise.race`：请求超时控制（API 请求 vs 5秒超时计时器，谁先完成用谁）
- `Promise.any`：多 CDN 回源（三个 CDN 同时请求，第一个响应的就用，其余取消）

### 题 2
问题：三个 `await` 是串行的，假设每个请求 200ms，总共需要 600ms。

```javascript
async function loadDashboard(userId) {
  const [user, orders, notifications] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchNotifications(userId),
  ]);
  return { user, orders, notifications };
}
// 现在只需要 ~200ms（最慢的那个）
```

### 题 3
输出：`results: []`（空数组）

原因：
- `forEach` 的回调是 async 函数，返回 Promise，但 `forEach` 不等待这些 Promise
- `forEach` 同步完成，此时三个 async 回调都还在等待 `setTimeout(100ms)` 中
- `console.log('results:', results)` 立即执行，results 还是空的
- 100ms 后，三个 processItem 陆续完成，push 到 results，但已经没人打印了

正确写法：
```javascript
await Promise.all(items.map(async item => {
  const result = await processItem(item);
  results.push(result);
}));
```

### 题 4
```javascript
function withTimeout(promise, ms) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeoutPromise]);
}

// 使用
const result = await withTimeout(fetchData(), 5000);
```

### 题 5
```javascript
async function asyncPool(limit, items, fn) {
  const executing = new Set();
  const results = [];
  for (const item of items) {
    const p = Promise.resolve(fn(item)).then(r => { executing.delete(p); return r; });
    executing.add(p);
    results.push(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

const users = await getUsers(); // 1000 个用户
await asyncPool(10, users, async user => {
  await sendEmail(user.email, 'Hello!');
  console.log(`✅ 发送给 ${user.email}`);
});
```
