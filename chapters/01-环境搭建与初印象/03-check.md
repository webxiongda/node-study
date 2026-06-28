# Day 01 — 验收自测题

> 独立作答，不要看理论文档。完成后对照答案。

---

## 第一轮：概念自测

### 题 1（概念题）
下面哪些说法是正确的？（多选）

A. `window` 是 Node.js 中的全局对象  
B. Node.js 可以直接操作文件系统  
C. Node.js 中可以使用 `document.getElementById`  
D. `process` 对象在 Node.js 中没有浏览器等价物  
E. Node.js 使用的 JS 引擎是 V8  

---

### 题 2（概念题）
`process.cwd()` 和 `__dirname` 有什么区别？什么情况下它们的值不同？

---

### 题 3（实操题）
写一段代码，从命令行解析以下格式的参数，输出一个对象：

```bash
node app.js --name=Alice --age=25 --debug
# 期望输出：{ name: 'Alice', age: '25', debug: true }
```

---

### 题 4（实操题）
以下代码的输出是什么？解释原因。

```javascript
process.on('exit', (code) => {
  console.log('exit event, code:', code);
  // 这里能执行异步操作吗？
  setTimeout(() => console.log('timeout in exit'), 0);
});

console.log('start');
process.exit(0);
console.log('end');
```

---

### 题 5（项目应用题）
你在写一个 Node.js CLI 工具，需要读取项目根目录下的 `config.json`。
你的脚本放在 `tools/build.js`，用户可能从任意目录执行 `node tools/build.js`。

问：应该用 `path.join(process.cwd(), 'config.json')` 还是 `path.join(__dirname, '../config.json')`？为什么？

---

## 参考答案

### 题 1 答案
**正确选项：B、D、E**

- A 错：Node.js 全局对象是 `global`（Node 11+ 可用 `globalThis`），不是 `window`
- B 对：Node.js 有完整的 `fs` 模块访问文件系统
- C 错：`document` 是浏览器 DOM API，Node.js 没有
- D 对：`process` 是 Node.js 独有的，浏览器中没有对应物
- E 对：Node.js 使用 Google V8 引擎执行 JavaScript

### 题 2 答案
- `process.cwd()` 返回**执行 node 命令时终端所在的目录**（运行时确定，可变）
- `__dirname` 返回**当前脚本文件所在的目录**（编译时确定，不变）

**值不同的场景**：
```bash
# 脚本在 /projects/app/src/server.js
# 用户从 /home/user 执行
cd /home/user
node /projects/app/src/server.js
# process.cwd() = '/home/user'
# __dirname    = '/projects/app/src'
```

### 题 3 答案
```javascript
const args = process.argv.slice(2);
const params = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    params[key] = value ?? true;
  }
});
console.log(params);
// { name: 'Alice', age: '25', debug: true }
```

### 题 4 答案
输出：
```
start
exit event, code: 0
```

原因：
1. `console.log('start')` 正常执行
2. `process.exit(0)` 触发同步的 `exit` 事件，执行回调
3. `exit` 事件回调中的 `setTimeout` **不会执行**：进程退出后事件循环已停止，异步操作无法继续
4. `console.log('end')` 永远不会执行（`process.exit` 之后的代码不再运行）

**关键点**：`exit` 事件回调只能执行**同步**代码。

### 题 5 答案
**应该用 `path.join(__dirname, '../config.json')`**

原因：
- `process.cwd()` 依赖用户从哪个目录执行命令，不可控
- `__dirname` 是脚本文件的固定位置，`../config.json` 永远指向项目根目录
- 用 `process.cwd()` 的话，用户从不同目录执行会找不到 config.json

**实际工程规范**：脚本内部引用自己项目的文件，用 `__dirname`；需要读取用户当前目录的文件，用 `process.cwd()`。
