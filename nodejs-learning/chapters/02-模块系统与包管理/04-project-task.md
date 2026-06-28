# Day 02 — 项目任务：模块化工具库

## 业务背景

你的团队在多个 Node.js 项目中重复写了相同的工具函数（字符串处理、数字格式化、日期工具）。
决定将它们抽取成一个内部工具库 `@internal/utils`，要求同时支持 CJS 和 ESM。

## 技术要求

**目录结构：**
```
utils/
├── package.json
├── src/
│   ├── string.js   # 字符串工具
│   ├── number.js   # 数字工具
│   └── index.js    # 统一入口
└── test.js         # 手动测试
```

**要实现的函数：**

`string.js`:
- `capitalize(str)` — 首字母大写，其余小写
- `truncate(str, maxLen, suffix='...')` — 超长截断
- `camelToKebab(str)` — `camelCase` 转 `kebab-case`

`number.js`:
- `formatCurrency(amount, currency='CNY')` — 格式化为货币字符串，如 `¥1,234.56`
- `clamp(value, min, max)` — 将值限制在 [min, max] 范围内
- `randomInt(min, max)` — 返回 [min, max] 范围内的随机整数

## 输入输出

```javascript
// test.js 运行结果：
const { capitalize, truncate, camelToKebab } = require('./src');
const { formatCurrency, clamp, randomInt } = require('./src');

console.log(capitalize('hello WORLD'));       // 'Hello world'
console.log(truncate('很长的标题内容文字', 6)); // '很长的标题...'
console.log(camelToKebab('myComponentName')); // 'my-component-name'
console.log(formatCurrency(1234.56));         // '¥1,234.56'
console.log(clamp(150, 0, 100));              // 100
console.log(randomInt(1, 10));                // 1-10 之间的随机数
```

## 验收标准

- [ ] 每个函数独立在对应文件中，通过 `index.js` 统一导出
- [ ] `truncate` 在中文字符下也能正确工作（按字符数，非字节数）
- [ ] `camelToKebab` 处理连续大写（如 `XMLParser` → `xml-parser`）
- [ ] `formatCurrency` 整数部分用逗号分隔（千分位）
- [ ] 不能安装任何第三方包

## 常见坑

1. **中文截断**：`str.slice(0, 6)` 对中文字符是按 Unicode 码点截断，一般没问题；但要注意 emoji 是 2 个码点，可能产生乱码。本题不用处理 emoji。
2. **`camelToKebab` 的正则**：`str.replace(/([A-Z])/g, '-$1').toLowerCase()` 会在字符串开头产生多余的 `-`，需要用 `trimStart('-')` 或 `ltrim` 处理。
3. **货币格式化**：可以用 `Intl.NumberFormat` 原生 API，不需要手写千分位逻辑。
