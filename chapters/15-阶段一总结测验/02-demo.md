# Day 15 — 限时编码挑战

> 以下三个挑战模拟面试场景，有时间限制。独立完成，不查文档。

---

## 挑战 1：HTTP 文件服务器（目标 30 分钟）

**要求：**
- 纯 `node:http` + `node:fs`，不安装任何包
- `GET /files` — 返回当前目录文件列表（JSON）
- `GET /files/:name` — 下载指定文件（流式传输）
- 文件不存在返回 404，目录穿越请求返回 403
- 正确设置 Content-Type

**示例：**
```bash
curl http://localhost:3000/files
# [{"name":"package.json","size":345},{"name":"README.md","size":2048}]

curl http://localhost:3000/files/README.md
# 文件内容...

curl http://localhost:3000/files/../../etc/passwd
# {"error":{"code":"FORBIDDEN","message":"Access denied"}}
```

---

## 挑战 2：并发爬虫（目标 30 分钟）

**要求：**
- 给定一个 URL 列表，并发抓取（最多 5 个并发）
- 每个 URL 有超时控制（5秒超时）
- 统计：成功数、失败数、平均响应时间
- 失败的 URL 自动重试 1 次

**接口：**
```javascript
async function crawl(urls, options = { concurrency: 5, timeout: 5000, retries: 1 }) {
  // 返回：{ results: [{url, status, duration}], stats: {success, failed, avgDuration} }
}
```

---

## 挑战 3：实时日志监控（目标 20 分钟）

**要求：**
- 监控一个日志文件（类似 `tail -f`）
- 新增的行如果包含 `ERROR` 则高亮输出（红色）
- 包含 `WARN` 则黄色输出
- 其他行正常输出
- 用 `fs.watch` 或 `setInterval` + `fs.stat` 检测文件变化

**使用：**
```bash
node log-monitor.js /var/log/app.log
# 实时输出新增的日志行，ERROR 红色，WARN 黄色
```

---

## 参考实现要点

### 挑战 1 要点
```javascript
// 路径安全检查
const safePath = path.resolve(rootDir, decodeURIComponent(filename));
if (!safePath.startsWith(path.resolve(rootDir))) {
  return res.json({ error: { code: 'FORBIDDEN' } }, 403);
}
// 流式传输
fs.createReadStream(safePath).pipe(res);
```

### 挑战 2 要点
```javascript
// 超时控制
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeout);
const res = await fetch(url, { signal: controller.signal });
clearTimeout(timer);

// asyncPool（Day 06 手写的）
await asyncPool(concurrency, urls, async url => { ... });
```

### 挑战 3 要点
```javascript
// 颜色输出
const RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
const colorize = line => 
  line.includes('ERROR') ? RED + line + RESET :
  line.includes('WARN')  ? YELLOW + line + RESET : line;

// 读取新增内容（记录上次读取位置）
let position = 0;
fs.watch(filePath, () => {
  const stat = fs.statSync(filePath);
  if (stat.size > position) {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(stat.size - position);
    fs.readSync(fd, buf, 0, buf.length, position);
    fs.closeSync(fd);
    position = stat.size;
    buf.toString().split('\n').filter(Boolean).forEach(line => {
      console.log(colorize(line));
    });
  }
});
```
