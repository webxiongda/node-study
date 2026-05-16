# Day 07 — 项目任务：静态文件服务器

## 业务背景

在使用 Vite/webpack 之前，你需要一个简单的静态文件服务器，用于本地开发时预览 HTML/CSS/JS 文件，支持正确的 MIME 类型、缓存控制，以及请求日志。

## 技术要求

纯 `node:http` + `node:fs` + `node:path`，不安装任何包。

## 功能要求

```bash
node static-server.js [目录] [端口]
node static-server.js ./public 8080
```

- 请求 `/` 自动寻找 `index.html`
- 根据文件扩展名设置正确的 `Content-Type`
- 支持 `304 Not Modified` 缓存（基于 `ETag`）
- 文件不存在返回 404，并提供友好错误页

## 期望效果

```
静态服务器启动: http://localhost:8080
服务目录: /Users/alice/myproject/public

GET /index.html           200  45ms  12.3 KB
GET /style.css            304   2ms  (缓存命中)
GET /app.js               200  12ms  89.2 KB
GET /images/logo.png      200  8ms   34.1 KB
GET /notfound.html        404  3ms
```

## MIME 类型映射（至少支持这些）

```javascript
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
```

## 验收标准

- [ ] 正确设置 Content-Type
- [ ] 根路径自动寻找 index.html
- [ ] 基于 ETag 的 304 缓存（使用文件 mtime 或 size 生成 ETag）
- [ ] 404 返回友好的 HTML 错误页
- [ ] 控制台输出格式化的访问日志（方法、路径、状态码、耗时）
- [ ] 路径穿越防护（阻止 `/../../../etc/passwd` 这类请求）

## 常见坑

1. **路径穿越攻击**：用户请求 `/../../etc/passwd` 可能读到系统文件。需要用 `path.resolve` 后检查是否在允许的目录下：`if (!resolvedPath.startsWith(rootDir)) return 403`。
2. **ETag 生成**：用 `stat.mtime.getTime() + '-' + stat.size` 即可，不需要 hash。比较时 `req.headers['if-none-match'] === etag`。
3. **流式传输**：大文件用 `fs.createReadStream(filePath).pipe(res)` 而不是 `readFile`。
