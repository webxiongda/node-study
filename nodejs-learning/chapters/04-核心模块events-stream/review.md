# Day 04 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| EventEmitter.on | 持久监听，需要手动 off |
| EventEmitter.once | 触发一次自动移除 |
| 内存泄漏 | 在循环/定时器里注册 on 是最常见来源 |
| Buffer.length | 字节数，非字符数 |
| Stream 四种类型 | Readable / Writable / Duplex / Transform |
| pipe | 自动处理背压，连接流管道的标准方式 |
| 背压 | write() 返回 false 时暂停上游，drain 后恢复 |
| 大文件处理 | 用 createReadStream + pipe，不用 readFile |

## 易错点

1. `Buffer.from('你好').length` = 6（UTF-8 中文每字 3 字节），不是 2
2. 每次 `on` 都会新增监听器，不会自动替换旧的
3. Transform 流的 `_flush` 在流结束时调用，用于输出缓冲区剩余数据（不要忘记）
4. `pipe` 出错时不会自动销毁所有流，需要用 `stream.pipeline()` 替代（Node.js 10+）

## 高频面试题

**Q1: 背压是什么？如何处理？**

见 check.md 题 2 答案。

**Q2: EventEmitter 如何防止内存泄漏？**

答：① 对一次性操作用 `once` 代替 `on`；② 组件销毁时调用 `off` 移除监听器；③ 避免在定时器/循环中调用 `on`；④ 用 `emitter.listenerCount()` 监控监听器数量。

**Q3: pipe 和手动监听 data 事件有什么区别？**

答：`pipe` 会自动处理背压（监听 `drain`），并在源流结束时自动关闭目标流（可通过 `{ end: false }` 禁用）。手动监听 `data` 需要自己处理背压，否则高速数据流会撑爆内存。

**Q4: 什么是 objectMode 流？**

答：默认流传输的是 Buffer 或字符串。`objectMode: true` 允许流传输任意 JavaScript 对象，如 `{ name: 'Alice' }`。常用于将解析后的数据在流管道中传递。

## 自测题

1. `emitter.emit('error')` 但没有注册 `error` 监听器，会发生什么？
2. 如何让一个可读流暂停/恢复？
3. `stream.pipeline()` 相比 `pipe` 的优势是什么？
4. `Buffer.concat([buf1, buf2])` 和直接字符串拼接有什么区别？

## 下一章建议

Day 05（事件循环）是 **Node.js 面试最高频考点之一**。需要深度理解，建议分配 3-4 小时。重点：六个阶段的执行顺序、nextTick vs setImmediate vs setTimeout(0)、为什么 Node.js 是单线程但能高并发。
