# Day 02 — 实操 Demo

## Demo 1：CJS 缓存机制验证

### 实操目标
亲眼验证 `require` 的缓存行为，建立"模块是单例"的直觉。

### 代码
```javascript
// counter.js
let count = 0;
module.exports = {
  increment() { return ++count; },
  getCount() { return count; },
};

// main.js
const c1 = require('./counter');
const c2 = require('./counter');

c1.increment();
c1.increment();

console.log('c1.getCount():', c1.getCount()); // 2
console.log('c2.getCount():', c2.getCount()); // 2（同一实例！）
console.log('c1 === c2:', c1 === c2);          // true
```

### 运行方式
```bash
node main.js
```

### 关注点
- `c1 === c2` 为 `true` — 两次 require 返回同一对象
- 这是为什么 Node.js 模块天然是单例的

---

## Demo 2：CJS vs ESM 互操作

### 实操目标
理解什么时候用 CJS，什么时候用 ESM，以及互操作规则。

### CJS 导入 ESM（❌ 不支持）
```javascript
// helper.mjs（ESM 文件）
export const hello = () => 'Hello from ESM!';

// main.cjs
const { hello } = require('./helper.mjs'); // ❌ 报错！
// Error [ERR_REQUIRE_ESM]: require() of ES Module is not supported
```

### ESM 导入 CJS（✅ 支持）
```javascript
// utils.js（CJS 文件）
module.exports = { greet: (name) => `Hello, ${name}!` };

// main.mjs（ESM 文件）
import utils from './utils.js'; // ✅ 可以，但只能导入 default
console.log(utils.greet('World'));
```

### 动态 import()（CJS 中导入 ESM 的唯一方式）
```javascript
// main.cjs
async function main() {
  const { hello } = await import('./helper.mjs'); // ✅ 动态导入
  console.log(hello());
}
main();
```

### 关注点
- 工程中混用 CJS/ESM 的唯一合法路径：`import()` 动态导入
- 新项目建议统一用 ESM（`"type": "module"`）

---

## Demo 3：模块解析路径追踪

### 实操目标
理解 `require` 如何查找模块，避免路径错误。

### 代码
```javascript
// resolve-demo.js
// require.resolve() 返回模块的实际绝对路径，不执行模块

// 内置模块
console.log(require.resolve('path'));   // 'path'（内置模块名称）
console.log(require.resolve('fs'));     // 'fs'

// 相对路径
console.log(require.resolve('./counter'));  
// 输出类似: /your/project/counter.js

// node_modules 中的包
console.log(require.resolve('lodash'));
// 输出类似: /your/project/node_modules/lodash/lodash.js

// 查看当前模块缓存
console.log('已缓存的模块数:', Object.keys(require.cache).length);
```

### 运行方式
```bash
# 先安装 lodash 测试
npm install lodash
node resolve-demo.js
```

### 关注点
- `require.resolve()` 只解析路径，不执行模块，适合调试路径问题
- `require.cache` 键是文件的绝对路径，不是相对路径
