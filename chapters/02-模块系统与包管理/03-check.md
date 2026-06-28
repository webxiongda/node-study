# Day 02 — 验收自测题

> 独立作答，不要翻笔记。

---

### 题 1（概念题）
以下关于 CJS 和 ESM 的说法，哪些正确？（多选）

A. CJS 的 `require` 是同步的  
B. ESM 支持在 `if` 语句里写 `import`  
C. ESM 支持 Tree Shaking，CJS 不支持  
D. CJS 文件可以直接 `require()` 一个 `.mjs` 文件  
E. ESM 中可以用 `import()` 动态导入 CJS 模块  

---

### 题 2（概念题）
`exports.foo = 1` 和 `module.exports = { foo: 1 }` 有什么区别？
以下代码的问题在哪里？

```javascript
// bad.js
exports = { foo: 1, bar: 2 };  // 这样行吗？
```

---

### 题 3（实操题）
写一个 `utils/index.js`，同时导出 `add(a,b)`、`subtract(a,b)` 两个函数，要求：
- 用 CJS 格式
- 从外部 require 后能直接解构使用：`const { add, subtract } = require('./utils')`

---

### 题 4（实操题）
以下代码输出什么？

```javascript
// a.js
console.log('a start');
const b = require('./b');
console.log('a end, b.val =', b.val);

// b.js
console.log('b start');
const a = require('./a');  // 循环依赖！
console.log('b end, a.val =', a.val);
module.exports = { val: 'B' };

// main.js
require('./a');
```

---

### 题 5（项目应用题）
你在开发一个工具库，需要同时支持 CJS 和 ESM 用户。
`package.json` 应该怎么配置 `exports` 字段？写出关键配置。

---

## 参考答案

### 题 1
**正确：A、C、E**
- A ✅：`require` 同步阻塞
- B ❌：ESM `import` 必须在顶层，不能在 `if` 里。动态导入用 `import()`
- C ✅：ESM 静态分析，打包工具可进行 Tree Shaking；CJS 运行时加载无法静态分析
- D ❌：CJS 不能直接 require ESM，会报 `ERR_REQUIRE_ESM`（Node.js 22+ 实验性支持除外）
- E ✅：`await import('./cjs-module.js')` 可以，但只能获取 default 导出

### 题 2
区别：
- `exports` 是 `module.exports` 的引用快捷方式
- `exports.foo = 1` — 在同一个对象上添加属性，有效
- `exports = { foo: 1 }` — 重新赋值 `exports` 变量，**断开了与 `module.exports` 的引用关系**，`module.exports` 还是原来的空对象，外部 require 拿到的是空对象

正确写法：`module.exports = { foo: 1, bar: 2 }`

### 题 3
```javascript
// utils/index.js
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }

module.exports = { add, subtract };
```

### 题 4
输出：
```
a start
b start
b end, a.val = undefined
a end, b.val = B
```

循环依赖处理：执行 `main.js` → require `a.js` → a 开始执行，require `b.js` → b 开始执行，require `a.js`（循环！）→ 返回 a 当前已执行的 `module.exports`（此时 a 还没执行完，`module.exports` 是初始空对象，`a.val` 是 `undefined`）→ b 继续执行完毕 → a 继续执行完毕。

### 题 5
```json
{
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "import": "./dist/index.mjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs"
}
```
`exports` 是 Node.js 12+ 的精确入口控制，优先级高于 `main`。
