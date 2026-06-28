# Day 03 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| path.join | 拼接路径，normalize 处理 `..`，不自动变绝对 |
| path.resolve | 从右往左，绝对路径重置，永远返回绝对路径 |
| fs 三种风格 | 同步（阻塞）/ 回调（传统）/ Promise（推荐） |
| fs/promises | Node.js 14+ 推荐方式，直接 `await` |
| mkdir recursive | `{ recursive: true }` 自动创建父目录且不报已存在错误 |
| readdir withFileTypes | 返回 `Dirent` 对象，有 `isDirectory()` 等方法 |
| 服务端避免同步 fs | 阻塞事件循环，影响所有请求 |

## 易错点

1. `path.join('/a', '/b')` = `'/a/b'`，`path.resolve('/a', '/b')` = `'/b'`（这是常见混淆点）
2. `readdir` 默认返回文件名字符串，不是完整路径；需要手动 `path.join(dir, entry.name)` 拼接
3. 检查文件是否存在，用 `fs.access()` 或 `fs.stat()` + try/catch，不要用已废弃的 `fs.exists()`
4. `mkdir` 不设 `recursive` 时，目标目录已存在也会报错

## 高频面试题

**Q1: path.join 和 path.resolve 的区别？**

答：见 theory.md。记住：resolve 永远绝对路径，遇到 `/` 开头的参数就从那里重置。

**Q2: Node.js 中如何高效读取大文件？**

答：不用 `readFile`（将整个文件读入内存），改用 `createReadStream` 流式读取，按 chunk 处理，内存占用是固定的。（Day 04 stream 会讲）

**Q3: 如何监听文件变化？**

答：`fs.watch(path, callback)` — 轻量，基于操作系统事件，可能触发多次（debounce）；生产中用 `chokidar` 包（更稳定的封装）。

## 自测题

1. `path.extname('index.test.ts')` 返回什么？
2. 如何判断一个路径是否是绝对路径？
3. `fs.readdir` 和 `fs.readdir({withFileTypes:true})` 返回值有什么区别？
4. `os.EOL` 在 Windows 上是什么值？

## 下一章建议

Day 04（events/stream/Buffer）是面试中等频率，但 EventEmitter 模式是整个 Node.js 的基础模式（HTTP、Stream、各种模块都继承自它）。Stream 的理解是 Day 04 最重要的内容，和 Day 07 的 HTTP 紧密相关。
