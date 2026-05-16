# Day 06 — 实操 Demo

## Demo 1：Promise 四兄弟对比

```javascript
// 模拟 API 请求
const delay = (ms, value, shouldFail = false) => new Promise((resolve, reject) =>
  setTimeout(() => shouldFail ? reject(new Error(`Failed: ${value}`)) : resolve(value), ms)
);

async function comparePromiseMethods() {
  const tasks = [
    delay(100, 'A'),
    delay(200, 'B'),
    delay(50,  'C', true),  // 这个会失败
  ];

  // 1. Promise.all — 有一个失败就全部失败
  try {
    const res = await Promise.all(tasks);
    console.log('all:', res);
  } catch (err) {
    console.log('all error:', err.message); // 'Failed: C'
  }

  // 重新创建（Promise 用过了）
  const tasks2 = [delay(100,'A'), delay(200,'B'), delay(50,'C',true)];
  
  // 2. Promise.allSettled — 全部结果
  const results = await Promise.allSettled(tasks2);
  results.forEach(r => {
    if (r.status === 'fulfilled') console.log('✅', r.value);
    else console.log('❌', r.reason.message);
  });

  // 3. Promise.race — 最快的（C 最快，50ms，但失败了）
  const tasks3 = [delay(100,'A'), delay(200,'B'), delay(50,'C',true)];
  try {
    const first = await Promise.race(tasks3);
    console.log('race:', first);
  } catch (err) {
    console.log('race error:', err.message); // C 最快且失败，所以报错
  }

  // 4. Promise.any — 第一个成功的
  const tasks4 = [delay(100,'A'), delay(200,'B'), delay(50,'C',true)];
  const first = await Promise.any(tasks4); // C 失败，等 A（100ms）
  console.log('any:', first); // 'A'
}

comparePromiseMethods();
```

---

## Demo 2：并发限制 asyncPool

```javascript
async function asyncPool(limit, items, fn) {
  const results = [];
  const executing = new Set();
  
  for (const item of items) {
    const p = Promise.resolve(fn(item)).then(result => {
      executing.delete(p);
      return result;
    });
    executing.add(p);
    results.push(p);
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

// 模拟：下载 10 个文件，最多同时 3 个
const files = Array.from({ length: 10 }, (_, i) => `file-${i}.zip`);
let active = 0;
let maxActive = 0;

const downloadFile = async (name) => {
  active++;
  maxActive = Math.max(maxActive, active);
  const ms = Math.random() * 300 + 100;
  await new Promise(r => setTimeout(r, ms));
  active--;
  console.log(`✅ ${name} (${ms.toFixed(0)}ms, 当前并发: ${active})`);
  return name;
};

console.log('开始下载（最大并发: 3）...');
const start = Date.now();
await asyncPool(3, files, downloadFile);
console.log(`完成！总时间: ${Date.now() - start}ms, 最大并发: ${maxActive}`);
```

---

## Demo 3：带指数退避的重试

```javascript
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 500, jitter = true } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${err.message}`);
      }
      
      // 指数退避 + 随机抖动
      let waitMs = baseDelay * 2 ** (attempt - 1);
      if (jitter) waitMs += Math.random() * waitMs * 0.1;
      
      console.log(`第 ${attempt} 次失败，${waitMs.toFixed(0)}ms 后重试...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

// 模拟一个时常失败的 API
let callCount = 0;
const unreliableAPI = () => {
  callCount++;
  if (callCount < 3) throw new Error('Service temporarily unavailable');
  return { data: 'success' };
};

const result = await withRetry(unreliableAPI, { maxRetries: 5, baseDelay: 200 });
console.log('最终结果:', result);
```
