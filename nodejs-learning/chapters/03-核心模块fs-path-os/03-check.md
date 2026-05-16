# Day 03 — 验收自测题

---

### 题 1（概念题）
以下说法正确的是？（多选）

A. `fs.readFileSync` 在服务端 API 中使用会阻塞所有请求  
B. `fs.watch` 监听文件变化是同步的  
C. `path.resolve` 的结果永远是绝对路径  
D. `fs.mkdir` 不设 `recursive: true` 时，如果父目录不存在会报错  
E. `os.freemem()` 返回的单位是 MB  

---

### 题 2（实操题）
`path.join` 和 `path.resolve` 各输出什么？

```javascript
console.log(path.join('/a', '/b', 'c'));
console.log(path.resolve('/a', '/b', 'c'));
console.log(path.resolve('foo', 'bar'));   // 假设 cwd 是 /home/user
```

---

### 题 3（实操题）
用 `fs/promises` 写一个函数 `fileExists(filePath)`，返回 `true`/`false`，不抛出异常：

---

### 题 4（概念题）
以下代码有什么问题？如何修复？

```javascript
// server.js — 处理每个 HTTP 请求时调用
async function handleRequest(req, res) {
  const config = fs.readFileSync('./config.json', 'utf8');
  const data = JSON.parse(config);
  res.end(JSON.stringify(data));
}
```

---

### 题 5（项目应用题）
你要写一个脚本，将 `src/` 目录下所有 `.md` 文件的路径输出出来（含子目录），不使用 `find` 命令，纯 Node.js 实现。

---

## 参考答案

### 题 1
**正确：A、C、D**
- A ✅：同步 API 阻塞事件循环，所有请求都得等
- B ❌：`fs.watch` 是异步的，基于操作系统的文件系统事件
- C ✅：`resolve` 永远返回绝对路径
- D ✅：`fs.mkdir('/a/b/c')` 时如果 `/a/b` 不存在会报 `ENOENT`
- E ❌：`freemem()` 单位是**字节**，除以 `1024²` 才是 MB

### 题 2
```
/a/b/c       （join 只是拼接，/b 的斜杠被 normalize 处理）
/b/c         （resolve 从右往左，/b 是绝对路径，重置起点）
/home/user/foo/bar  （以 cwd 为基准）
```

### 题 3
```javascript
const fs = require('fs/promises');
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
// 或者用 stat：
async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
```

### 题 4
问题：在请求处理函数中使用了 `fs.readFileSync`（同步 API），每次请求都会阻塞事件循环。

修复方案1（每次读文件，改异步）：
```javascript
const { readFile } = require('fs/promises');
async function handleRequest(req, res) {
  const config = await readFile('./config.json', 'utf8');
  res.end(config); // config 已经是 JSON 字符串，不需要再 JSON.parse + stringify
}
```

修复方案2（启动时读一次，缓存）：
```javascript
let config;
async function init() {
  config = JSON.parse(await readFile('./config.json', 'utf8'));
}
async function handleRequest(req, res) {
  res.end(JSON.stringify(config)); // 直接用内存中的缓存
}
```

### 题 5
```javascript
const fs = require('fs/promises');
const path = require('path');

async function findMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = await Promise.all(entries.map(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findMarkdownFiles(full);
    if (entry.name.endsWith('.md')) return full;
    return null;
  }));
  return results.flat().filter(Boolean);
}

findMarkdownFiles('./src').then(files => files.forEach(console.log));
```
