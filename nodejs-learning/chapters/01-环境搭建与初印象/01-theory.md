# Day 01 — 环境搭建与 Node.js 初印象 · 理论文档

## 核心概念

### 1. Node.js 是什么？

Node.js 是一个**基于 Chrome V8 引擎的 JavaScript 运行时**。

关键理解：它不是框架，不是库，而是让 JS 能跑在服务端的「运行环境」。就像浏览器是 JS 的运行环境一样，Node.js 是另一个运行环境，但多了文件系统、网络等系统级能力。

**浏览器 JS vs Node.js 核心区别：**

| 维度 | 浏览器 JS | Node.js |
|------|----------|---------|
| 全局对象 | `window` | `global` / `globalThis` |
| DOM/BOM | ✅ 有 | ❌ 没有 |
| 文件系统 | ❌ 受限 | ✅ 完整访问 |
| 模块系统 | ESModule | CommonJS + ESModule |
| 用途 | UI 交互、页面渲染 | API 服务、工具链、脚本 |

---

### 2. process 对象（面试高频）

`process` 是 Node.js 中**最重要的全局对象**，没有浏览器等价物。

```javascript
process.version        // Node.js 版本
process.platform       // 操作系统：'darwin' / 'linux' / 'win32'
process.arch           // CPU 架构：'x64' / 'arm64'
process.pid            // 进程 ID
process.cwd()          // 当前工作目录（运行命令的目录）
process.env            // 环境变量对象（.env 文件加载后在这里）
process.argv           // 命令行参数数组
process.exit(code)     // 退出进程，0=正常，非0=异常
process.memoryUsage()  // 内存使用情况
process.uptime()       // 进程运行时长（秒）

// 标准输入输出
process.stdin          // 标准输入（可读流）
process.stdout         // 标准输出（可写流）
process.stderr         // 标准错误（可写流）
```

**process.argv 的结构：**
```bash
node calc.js add 3 5
# argv[0] = node 可执行文件的路径
# argv[1] = 脚本文件的绝对路径
# argv[2] = 'add'
# argv[3] = '3'
# argv[4] = '5'
```
所以解析自定义参数总是从 `process.argv.slice(2)` 开始。

---

### 3. 模块作用域中的特殊变量

在 CommonJS 模式下，每个文件是一个独立模块，有以下特殊变量：

```javascript
__filename   // 当前文件的绝对路径（字符串）
__dirname    // 当前文件所在目录的绝对路径（字符串）
module       // 当前模块对象
exports      // 模块导出对象（module.exports 的引用）
require      // 引入其他模块的函数
```

**注意**：这些变量在 ESModule（`.mjs` 或 `"type": "module"`）中**不可用**，需要用 `import.meta.url` 替代。

---

### 4. REPL（Read-Eval-Print-Loop）

Node.js 的交互式命令行，直接在终端输入 `node` 进入。

用途：
- 快速验证一段代码的输出
- 探索 API 的行为
- 面试准备时验证自己的理解

常用命令：`.exit` 退出、`.help` 查帮助、`Tab` 自动补全。

---

## 工作原理

Node.js 的运行底层依赖两个核心：

1. **V8 引擎**：执行 JavaScript 代码（Google Chrome 同款）
2. **libuv**：提供跨平台的异步 I/O 能力（文件、网络、定时器等）

这个组合决定了 Node.js 的核心特征：**单线程 + 非阻塞异步 I/O**。这个在 Day 05（事件循环）会深入讲解，是面试必考点。

---

## 使用场景

Node.js 最适合：
- REST API / GraphQL API 后端服务
- 实时通信（WebSocket）
- 工具链（Webpack、Vite、ESLint 等都是 Node.js 写的）
- 全栈框架（Next.js、Nuxt.js 的服务端渲染）
- 命令行工具（CLI）

不适合：
- CPU 密集型计算（因为单线程，计算会阻塞事件循环）

---

## 常见问题

**Q: `process.cwd()` vs `__dirname` 有什么区别？**
- `process.cwd()` 是**执行命令时的目录**（终端当前所在的位置）
- `__dirname` 是**脚本文件所在的目录**（固定的）
- 如果你在 `/home/user` 执行 `node /projects/app/server.js`，`cwd()` 返回 `/home/user`，`__dirname` 返回 `/projects/app`

**Q: `process.exit()` 里的退出码有什么用？**
- 约定：`0` = 成功，非 `0` = 失败
- CI/CD 系统、Shell 脚本用退出码判断上一步是否成功

**Q: Node.js 中能用 `console.log` 写日志吗？**
- 能用，但生产环境不推荐。`console.log` 是同步操作，高并发下会阻塞。生产用 Pino 或 Winston 等异步日志库。

---

## 面试高频问题

1. **Node.js 和浏览器中的 JavaScript 有什么区别？**
   - 运行环境不同、全局对象不同、API 不同（无 DOM/BOM，有 fs/net 等）、模块系统不同

2. **Node.js 适合做什么？不适合做什么？**
   - 适合 I/O 密集型（API 服务、实时通信）；不适合 CPU 密集型（大量计算会阻塞事件循环）

3. **process.argv 是什么？如何解析命令行参数？**
   - 数组，前两项固定为 node 路径和脚本路径，从 index 2 开始是用户参数

4. **`__dirname` 和 `process.cwd()` 的区别？**
   - 见上方常见问题

5. **Node.js 单线程如何处理高并发？**
   - 事件循环 + 非阻塞 I/O（Day 05 深讲）
