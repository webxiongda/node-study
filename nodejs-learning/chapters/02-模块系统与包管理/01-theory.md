# Day 02 — 模块系统与包管理 · 理论文档

## 核心概念

### 1. 为什么需要模块系统？

没有模块系统时，所有变量都是全局的，多个文件之间会相互污染。模块系统解决了：
- **封装**：文件内部变量不泄漏到全局
- **复用**：可以 import/require 其他文件
- **依赖管理**：明确声明谁依赖谁

Node.js 支持两套模块系统：**CommonJS（CJS）** 和 **ESModule（ESM）**。

---

### 2. CommonJS（CJS）— 面试必考

Node.js 默认模块系统，文件扩展名 `.js`（无 `"type": "module"` 时）。

**导出：**
```javascript
// math.js
function add(a, b) { return a + b; }
const PI = 3.14159;

module.exports = { add, PI };        // 整体导出
// 或者
exports.add = add;                    // 逐个挂载（exports 是 module.exports 的引用）
```

**导入：**
```javascript
const { add, PI } = require('./math');
const math = require('./math');  // 拿到整个对象
```

**CJS 关键特性（面试考点）：**

| 特性 | 说明 |
|------|------|
| 同步加载 | `require()` 是同步的，会阻塞直到模块加载完 |
| 缓存机制 | 同一模块只执行一次，之后返回缓存的 `module.exports` |
| 运行时解析 | `require` 可以写在条件语句、函数里 |
| 动态路径 | `require('./' + filename)` 合法 |

**缓存验证：**
```javascript
// counter.js
let count = 0;
module.exports = { increment: () => ++count, getCount: () => count };

// a.js
const c = require('./counter');
c.increment();
console.log(c.getCount()); // 1

// b.js（同一进程中）
const c = require('./counter'); // 返回缓存，不重新执行 counter.js
console.log(c.getCount()); // 仍然是 1，说明共享同一个实例
```

---

### 3. ESModule（ESM）— 现代标准

Node.js v12+ 支持，两种开启方式：
1. 文件后缀改为 `.mjs`
2. `package.json` 中设置 `"type": "module"`

**导出：**
```javascript
// math.mjs
export function add(a, b) { return a + b; }
export const PI = 3.14159;
export default class Calculator { ... }
```

**导入：**
```javascript
import { add, PI } from './math.mjs';
import Calculator from './math.mjs';
import * as math from './math.mjs';
```

**ESM 关键特性（面试考点）：**

| 特性 | 说明 |
|------|------|
| 静态分析 | import 必须在文件顶层，不能动态 |
| 异步加载 | 支持 `import()` 动态异步导入 |
| 实时绑定 | 导入的是值的"引用"，原始模块修改会反映到导入处 |
| 无 `__dirname` | 需用 `import.meta.url` 替代 |

**ESM 中获取 `__dirname` 等价物：**
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

---

### 4. CJS vs ESM 对比（面试高频）

| 维度 | CommonJS | ESModule |
|------|----------|----------|
| 语法 | `require` / `module.exports` | `import` / `export` |
| 加载时机 | 同步，运行时 | 异步，编译时静态分析 |
| `__dirname` | ✅ 有 | ❌ 无（用 `import.meta.url`） |
| Tree Shaking | ❌ 不支持 | ✅ 支持（打包工具可优化） |
| 顶层 `await` | ❌ | ✅ |
| 混用 | CJS 可以 `require` ESM 吗？| ❌ 不可以（反过来 ESM 可以 `import` CJS）|

---

### 5. package.json 关键字段

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",          // 默认 "commonjs"，设为 "module" 开启 ESM
  "main": "dist/index.js",   // CJS 入口
  "module": "dist/index.mjs", // ESM 入口（bundler 使用）
  "exports": {               // 精确控制入口（Node.js 12+ 推荐）
    ".": {
      "require": "./dist/index.cjs",
      "import": "./dist/index.mjs"
    }
  },
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"  // Node 18+ 内置 watch 模式
  },
  "dependencies": {},        // 生产依赖
  "devDependencies": {}      // 开发依赖（不打包进生产）
}
```

---

### 6. 模块解析算法（面试偶尔考）

`require('./foo')` 的解析顺序：
1. 尝试 `./foo`（精确匹配）
2. 尝试 `./foo.js`
3. 尝试 `./foo.json`
4. 尝试 `./foo.node`（原生模块）
5. 尝试 `./foo/index.js`
6. 尝试 `./foo/package.json` 中的 `main` 字段

`require('lodash')`（无路径前缀）的解析：
- 从当前目录往上，逐级查找 `node_modules/lodash`

---

## 面试高频问题

**Q1: CJS 和 ESM 最本质的区别是什么？**

答：加载时机。CJS 是运行时同步加载（require 时执行模块代码）；ESM 是编译时静态分析（JS 引擎在执行前就确定了所有依赖关系），所以 ESM 支持 Tree Shaking 而 CJS 不支持。

**Q2: `require` 的缓存机制是什么？有什么影响？**

答：第一次 `require` 一个模块时，Node.js 执行该模块并将 `module.exports` 缓存在 `require.cache` 中。后续 `require` 同一路径直接返回缓存，不重新执行。影响：
- 模块是单例的（同一进程中，状态共享）
- 可以手动清除缓存：`delete require.cache[require.resolve('./module')]`

**Q3: ESM 中如何获取 `__dirname`？**

答：
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
```

**Q4: 什么是循环依赖？CJS 如何处理？**

答：A require B，B require A。CJS 的处理方式：当检测到循环时，返回该模块**当前已执行部分的 exports**（可能是空对象或部分导出）。这会导致拿到未完全初始化的模块，是常见 bug 来源。解决方案：重构代码，提取公共依赖到第三个模块。

**Q5: `dependencies` 和 `devDependencies` 的区别？**

答：`dependencies` 是生产环境需要的包（运行时依赖），`devDependencies` 只在开发时需要（如 TypeScript、ESLint、测试框架）。`npm install --production` 只安装 `dependencies`。
