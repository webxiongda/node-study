# Day 06 — 异步编程模式 · 理论文档

> ⭐⭐⭐⭐ 面试高频，必须深度掌握。

## 核心概念

### 1. 异步演进史

```
Callback（回调地狱）→ Promise（链式）→ async/await（同步写法）
```

**回调地狱（为什么不好）：**
```javascript
// ❌ 嵌套地狱
readFile(path, (err, data) => {
  parseJSON(data, (err, obj) => {
    queryDB(obj.id, (err, user) => {
      sendEmail(user.email, (err) => {
        // 4 层嵌套，错误处理分散，无法 try/catch
      });
    });
  });
});
```

---

### 2. Promise 核心（面试必考）

**Promise 三种状态：** `pending` → `fulfilled` / `rejected`（状态不可逆）

**Promise 并发控制四兄弟（⭐ 必背）：**

| 方法 | 行为 | 适用场景 |
|------|------|---------|
| `Promise.all([...])` | 全部成功才 resolve，有一个 reject 立即 reject | 所有任务必须成功（如并行请求多个 API，全部要用） |
| `Promise.allSettled([...])` | 全部完成（无论成败）才 resolve | 需要知道每个任务的结果，不管是否失败 |
| `Promise.race([...])` | 第一个完成（成功或失败）就结束 | 超时控制、竞态（哪个 CDN 先响应就用哪个） |
| `Promise.any([...])` | 第一个成功才 resolve；全部失败才 reject | 容错：多个备选源，有一个成功就行 |

```javascript
// Promise.all — 并行请求，全部成功
const [user, posts, comments] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id),
]);

// Promise.allSettled — 批量操作，容忍失败
const results = await Promise.allSettled(emails.map(sendEmail));
const succeeded = results.filter(r => r.status === 'fulfilled').length;
const failed = results.filter(r => r.status === 'rejected');

// Promise.race — 超时控制
const data = await Promise.race([
  fetchData(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
]);

// Promise.any — 第一个成功的备用源
const data = await Promise.any([
  fetch('https://cdn1.example.com/data'),
  fetch('https://cdn2.example.com/data'),
  fetch('https://cdn3.example.com/data'),
]);
```

---

### 3. async/await 最佳实践（面试考陷阱）

**串行 vs 并行（⭐ 最常考陷阱）：**

```javascript
// ❌ 串行（慢！）— 三个请求依次等待
async function serial() {
  const a = await fetchA(); // 等 1s
  const b = await fetchB(); // 再等 1s
  const c = await fetchC(); // 再等 1s
  // 总共 3s
}

// ✅ 并行（快！）— 三个请求同时发出
async function parallel() {
  const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
  // 总共 1s（最慢的那个）
}

// ⚠️ 看起来并行，其实也是并行（但错误处理不同）
async function alsoParallel() {
  const pA = fetchA();  // 立即发出请求
  const pB = fetchB();  // 立即发出请求
  const a = await pA;
  const b = await pB;
}
```

**错误处理：**
```javascript
// ✅ 推荐：try/catch
async function getData() {
  try {
    const data = await fetchData();
    return data;
  } catch (err) {
    console.error('Failed:', err.message);
    return null; // 或者 rethrow
  }
}

// 陷阱：forEach + async（不会等待！）
// ❌ 错误
async function processAll(items) {
  items.forEach(async item => {
    await process(item); // forEach 不等待这个 promise
  });
  console.log('完成了吗？没有！');
}

// ✅ 正确
async function processAll(items) {
  await Promise.all(items.map(item => process(item)));
  // 或者串行：
  for (const item of items) {
    await process(item);
  }
}
```

---

### 4. 并发限制（限制同时并发数）

如果有 1000 个任务，`Promise.all` 会同时发出 1000 个请求，可能撑爆服务器或本地文件句柄。需要限制并发数：

```javascript
// asyncPool：限制同时运行的 Promise 数量
async function asyncPool(limit, items, fn) {
  const results = [];
  const executing = new Set();
  
  for (const item of items) {
    const promise = Promise.resolve(fn(item)).then(result => {
      executing.delete(promise);
      return result;
    });
    executing.add(promise);
    results.push(promise);
    
    if (executing.size >= limit) {
      await Promise.race(executing); // 等任意一个完成
    }
  }
  
  return Promise.all(results);
}

// 使用：最多同时 3 个并发
const results = await asyncPool(3, urls, url => fetch(url));
```

---

### 5. 重试机制（面试考点）

```javascript
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // 指数退避：1s → 2s → 4s
      await new Promise(resolve => setTimeout(resolve, delay * 2 ** (attempt - 1)));
    }
  }
}

// 使用
const data = await withRetry(() => fetch('https://api.example.com/data'));
```

---

### 6. 异步迭代器（for await...of）

```javascript
// 逐块处理流数据
async function processStream(stream) {
  for await (const chunk of stream) {
    await process(chunk);
  }
}

// 异步生成器（生产 API 分页数据）
async function* paginate(fetchPage) {
  let page = 1;
  while (true) {
    const data = await fetchPage(page++);
    if (data.length === 0) break;
    yield* data;
  }
}

for await (const item of paginate(fetchUsers)) {
  console.log(item);
}
```

---

## 面试高频问题

**Q1: Promise.all 和 Promise.allSettled 的区别？**

答：`Promise.all` 有一个 reject 就立即 reject（fail-fast）；`Promise.allSettled` 等所有 promise 都 settle（无论成败），返回每个的状态和值/原因。用 `all` 当所有任务必须成功；用 `allSettled` 当需要知道所有任务的结果。

**Q2: async/await 中如何实现并发执行？**

答：不要连续 `await`（串行），而是先创建所有 Promise，再用 `Promise.all` 等待：
```javascript
// ✅
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

**Q3: forEach + async 有什么问题？**

答：`Array.forEach` 不处理回调返回的 Promise，所以 async 回调的 await 不会阻塞 forEach 继续。整个 forEach 是同步的，不等待异步操作完成。应改用 `for...of` 或 `Promise.all(array.map(...))`。

**Q4: 什么是指数退避？为什么重试要用它？**

答：每次重试等待时间翻倍（1s, 2s, 4s...）。好处：避免所有客户端同时重试打垮刚恢复的服务（雷暴效应）。生产中还会加上随机抖动（jitter）进一步分散重试时机。

**Q5: 如何实现一个带超时的 Promise？**

答：
```javascript
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]);
}
```
