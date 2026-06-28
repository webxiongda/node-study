# Day 09 — 复习文档

## 核心知识点总结

| 知识点 | 要点 |
|--------|------|
| 中间件本质 | (req, res, next) 函数 + 顺序执行 |
| next() | 传递控制权；next(err) 跳到错误处理 |
| 中间件顺序 | logger → cors → bodyParser → 路由 → 错误处理 |
| 错误中间件 | 四个参数 (err, req, res, next)，必须放最后 |
| 洋葱模型 | Koa 的 await next() 前后双向执行 |
| 自定义错误 | 继承 Error，加 status 字段，由错误中间件统一处理 |

## 易错点

1. 忘记调用 `next()` 导致请求挂起（没有响应）
2. 错误处理中间件必须四个参数，否则 Express 不认为是错误处理中间件
3. 中间件顺序错误：CORS 在路由后面 → 预检请求会走到路由被 404
4. async 中间件中未捕获的 rejection 需要显式 try/catch + next(err)

## 高频面试题

**Q1: Express 中间件原理？**

维护中间件数组，请求到来时从头执行，每个函数通过 next() 传递控制权，next(err) 跳到错误处理函数。

**Q2: Express 和 Koa 中间件的区别？**

Express 线性单向；Koa 洋葱双向，基于 async/await，await next() 后可以拿到下游的响应。

**Q3: 如何实现全局错误处理？**

注册四参数的错误处理中间件 `(err, req, res, next)`，放在所有路由之后。路由内抛出的错误通过 `next(err)` 或未捕获的 async rejection 冒泡到这里。

## 自测题

1. 什么叫"洋葱模型"？用图示说明。
2. `app.use()` 和 `app.get()` 注册的中间件有什么区别？
3. 如果路由 handler 是 async 函数，如何确保错误能被错误处理中间件捕获？
4. 限流中间件应该放在什么位置？

## 下一章建议

Day 10 是里程碑，把 Day 01-09 的代码整理成一个完整项目。重点：代码重构技巧、README 写法、如何呈现给面试官。
