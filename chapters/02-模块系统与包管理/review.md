# Day 02 — 复习文档

## 核心知识点总结

| 知识点 | 一句话总结 |
|--------|----------|
| CJS require | 同步加载，运行时解析，有缓存 |
| CJS 缓存 | 同一模块只执行一次，返回同一 exports 对象（单例） |
| exports 陷阱 | `exports = {}` 会断开引用，必须用 `module.exports = {}` |
| ESM import | 静态分析，顶层声明，支持 Tree Shaking |
| 混用规则 | ESM 可 import CJS；CJS 不能 require ESM（只能 `import()`）|
| package.json type | `"module"` 启用 ESM；默认 `"commonjs"` |
| exports 字段 | 精确控制包入口，支持 CJS/ESM 双模式 |

## 易错点

1. `exports.foo = 1` ✅ vs `exports = { foo: 1 }` ❌（后者断开引用）
2. CJS 循环依赖会拿到部分 exports（未初始化完的对象）
3. `.mjs` 文件中没有 `__dirname`，要用 `fileURLToPath(import.meta.url)`
4. `"type": "module"` 后，目录下所有 `.js` 都变成 ESM，原有 require 会报错

## 高频面试题

**Q1: CJS 和 ESM 的核心区别？**

答：加载时机和分析方式。CJS 运行时同步加载，每次 require 时才执行模块代码；ESM 编译时静态分析依赖图，支持 Tree Shaking，顶层 await，实时绑定。

**Q2: require 的缓存机制？**

答：`require.cache` 以文件绝对路径为 key 缓存 `module.exports`。首次 require 执行模块并缓存，后续直接返回缓存。可以 `delete require.cache[require.resolve('./mod')]` 清除缓存强制重新加载。

**Q3: 什么情况下 `exports.foo = 1` 会失效？**

答：如果之前有 `module.exports = someObject` 重新赋值了 `module.exports`，那么 `exports` 引用已经与 `module.exports` 断开，后续 `exports.foo = 1` 不会出现在最终导出中。

**Q4: CJS 如何处理循环依赖？**

答：返回该模块当前已执行部分的 exports（可能是空对象或不完整的导出），不会死循环。这可能导致拿到 undefined 的属性，是常见的隐蔽 bug。

**Q5: devDependencies 和 dependencies 的区别？**

答：dependencies 是运行时需要的（如 express、lodash），devDependencies 是开发时需要的（如 typescript、jest）。`npm install --production` 只安装 dependencies，减少生产镜像体积。

## 自测题

1. `require('./foo')` 解析时会依次尝试哪些文件路径？
2. 如何在 ESM 文件中获得等价于 `__dirname` 的值？
3. 一个包同时支持 CJS 和 ESM，`package.json` 的哪个字段可以做到？
4. `import * as math from './math.js'` 中的 `math` 是什么？

## 下一章建议

Day 03（fs/path/os）是实用 API，重点掌握 `fs/promises` 的异步用法和 `path.resolve` vs `path.join` 的区别。面试不高频，但项目中天天用。
