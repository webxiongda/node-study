# Day 03 — 核心模块 fs / path / os · 理论文档

## 核心概念

### 1. path 模块 — 跨平台路径处理

Windows 用 `\`，Linux/Mac 用 `/`。`path` 模块屏蔽差异。

```javascript
const path = require('path');
// 或 import path from 'path';

path.join('/foo', 'bar', 'baz.txt')    // '/foo/bar/baz.txt'
path.resolve('src', 'index.js')        // 转为绝对路径（以 cwd 为基准）
path.dirname('/foo/bar/baz.txt')       // '/foo/bar'
path.basename('/foo/bar/baz.txt')      // 'baz.txt'
path.basename('/foo/bar/baz.txt', '.txt') // 'baz'
path.extname('/foo/bar/baz.txt')       // '.txt'
path.parse('/home/user/file.txt')
// { root: '/', dir: '/home/user', base: 'file.txt', ext: '.txt', name: 'file' }
path.sep   // 路径分隔符：'/' (Unix) 或 '\' (Windows)
```

**`path.join` vs `path.resolve`（面试考点）：**

| 方法 | 说明 |
|------|------|
| `path.join(a, b)` | 简单拼接，结果是**相对或绝对**，取决于首段 |
| `path.resolve(a, b)` | 从右往左处理，遇到绝对路径停止，结果**永远是绝对路径** |

```javascript
path.join('foo', '/bar')       // 'foo/bar'（拼接，/ 不特殊）
path.resolve('foo', '/bar')    // '/bar'（/bar 是绝对路径，从这里开始）
path.resolve('/foo', 'bar')    // '/foo/bar'
```

---

### 2. fs 模块 — 三种风格的 API

Node.js 的 `fs` 模块提供三种风格：

```javascript
// 1. 同步（阻塞）— 仅用于启动时初始化，生产代码避免用
const data = fs.readFileSync('./config.json', 'utf8');

// 2. 回调（异步，传统）
fs.readFile('./config.json', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// 3. Promise（异步，推荐）✅
const { readFile, writeFile } = require('fs/promises');
const data = await readFile('./config.json', 'utf8');
```

**推荐使用 `fs/promises`**（Node.js 14+ 正式版）。

**常用 API：**
```javascript
const fs = require('fs/promises');

// 读写文件
await fs.readFile(path, 'utf8')          // 读文本
await fs.readFile(path)                  // 读 Buffer（二进制）
await fs.writeFile(path, content)        // 写文件（覆盖）
await fs.appendFile(path, content)       // 追加写
await fs.copyFile(src, dest)             // 复制文件

// 目录操作
await fs.mkdir(path, { recursive: true }) // 创建目录（recursive=自动创建父目录）
await fs.readdir(path)                    // 读取目录内容（文件名数组）
await fs.readdir(path, { withFileTypes: true }) // 带类型信息
await fs.rm(path, { recursive: true })   // 删除文件或目录

// 文件信息
const stat = await fs.stat(path)
stat.isFile()       // 是否是文件
stat.isDirectory()  // 是否是目录
stat.size           // 文件大小（字节）
stat.mtime          // 最后修改时间

// 监控文件变化
fs.watch(path, (event, filename) => { /* ... */ })
```

---

### 3. os 模块 — 系统信息

```javascript
const os = require('os');

os.type()        // 'Linux' / 'Darwin' / 'Windows_NT'
os.platform()    // 'linux' / 'darwin' / 'win32'
os.arch()        // 'x64' / 'arm64'
os.homedir()     // 用户主目录
os.tmpdir()      // 临时文件目录
os.hostname()    // 机器名
os.totalmem()    // 总内存（字节）
os.freemem()     // 可用内存（字节）
os.cpus()        // CPU 信息数组
os.uptime()      // 系统运行时长（秒）
os.loadavg()     // [1min, 5min, 15min] 平均负载（Unix only）
os.networkInterfaces() // 网络接口信息
os.EOL           // 行尾符：'\n' (Unix) 或 '\r\n' (Windows)
```

---

## 工作原理

`fs` 模块的异步操作底层通过 **libuv** 的线程池（默认 4 个线程）执行 I/O 操作，完成后将回调推入事件循环的 I/O callbacks 阶段。这就是为什么 `fs.readFile` 不会阻塞主线程。

---

## 常见问题

**Q: 什么时候用同步 API？**

只在以下场景用同步：
- 程序启动时的一次性配置读取
- CLI 工具中的简单脚本
- 绝对不会被并发调用的初始化代码

服务端 API 处理函数中**绝对不用同步 fs API**，会阻塞所有请求。

**Q: `path.join(__dirname, '../config.json')` 和 `path.resolve(__dirname, '../config.json')` 有什么区别？**

这里 `__dirname` 是绝对路径，两者结果相同。主要区别在第一个参数是相对路径时：`join` 保持相对，`resolve` 转为绝对。

---

## 面试高频问题

**Q1: `path.join` 和 `path.resolve` 的区别？**

答：`join` 只是拼接路径片段，结果可以是相对路径；`resolve` 从右向左处理参数，遇到绝对路径作为起点，最终返回绝对路径（如果没有绝对路径段，以 `process.cwd()` 为基准）。

**Q2: 为什么不推荐在 Node.js 服务中用同步 fs API？**

答：`fs.readFileSync` 等同步 API 会阻塞 JavaScript 主线程（事件循环），在此期间无法处理任何其他请求。对于高并发服务来说，这会严重降低吞吐量，导致请求排队甚至超时。

**Q3: 如何递归读取一个目录下所有文件？**

答：
```javascript
async function readAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? readAllFiles(full) : full;
  }));
  return files.flat();
}
```
