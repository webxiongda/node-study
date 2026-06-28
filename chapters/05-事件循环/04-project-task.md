# Day 05 — 项目任务：事件循环阻塞检测器

## 业务背景

生产环境中，开发者有时会不小心写出阻塞事件循环的代码（大 JSON 解析、同步 crypto、复杂计算），导致 API 响应延迟飙升但看不出原因。你需要实现一个简单的"阻塞检测中间件"。

## 技术要求

不使用第三方包，纯 Node.js 实现。

## 实现思路

**原理**：如果事件循环没有被阻塞，每隔 100ms 的 setInterval 应该准时触发。如果实际触发时间比预期晚了超过阈值（如 50ms），说明事件循环被阻塞了。

## 输入输出

```javascript
// 使用方式
const detector = new BlockDetector({ threshold: 50, interval: 100 });
detector.start();

detector.on('blocked', ({ expected, actual, delay }) => {
  console.warn(`⚠️ 事件循环阻塞！预期 ${expected}ms，实际 ${actual}ms，延迟 ${delay}ms`);
});

// 模拟一些阻塞操作
setTimeout(() => {
  // 故意阻塞 300ms
  const end = Date.now() + 300;
  while (Date.now() < end) {}
}, 500);

// 期望输出：
// ⚠️ 事件循环阻塞！预期 100ms，实际 412ms，延迟 312ms
```

## 验收标准

- [ ] 继承 EventEmitter，触发 `blocked` 事件
- [ ] 正确计算每次 interval 的实际延迟
- [ ] 支持 `start()` 和 `stop()` 方法
- [ ] 超过阈值才触发事件，正常波动（<50ms）不报警
- [ ] 统计：记录最大阻塞时间、总阻塞次数，通过 `getStats()` 返回

## 常见坑

1. **setInterval 的精度**：`setInterval(fn, 100)` 不保证精确 100ms，系统繁忙时本身就有误差。需要记录上次触发的时间戳来计算实际间隔，而不是只用 `interval` 值。
2. **CPU 密集测试**：用 `while (Date.now() < end) {}` 模拟阻塞时，如果阻塞代码和检测代码在同一事件循环，检测必然延迟——这正是我们要检测的场景。
3. **stop 清理**：`clearInterval` 时也应该重置内部状态，避免二次 start 统计数据混乱。
