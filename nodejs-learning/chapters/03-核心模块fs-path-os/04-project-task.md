# Day 03 — 项目任务：项目文件统计工具

## 业务背景

团队需要一个 CLI 工具，每次提交代码前统计项目的文件分布情况，用于代码审查和项目健康度监控。

## 技术要求

纯 Node.js，不允许安装第三方包。

## 输入输出

```bash
node stats.js [目录] [--ext=js,ts,md]
```

**期望输出：**
```
📊 项目文件统计报告
扫描目录: /Users/alice/projects/myapp
排除目录: node_modules, .git, dist

按扩展名统计:
  .ts    ████████████ 48 个文件  (38.7%)
  .js    ████████     32 个文件  (25.8%)
  .json  ████         16 个文件  (12.9%)
  .md    ████         15 个文件  (12.1%)
  其他                13 个文件  (10.5%)

总计: 124 个文件，共 456.2 KB
最大文件: src/database/schema.ts (48.3 KB)
最近修改: src/api/users.ts (2026-05-16 14:23)
```

## 验收标准

- [ ] 递归扫描目录（跳过 `node_modules`、`.git`、`dist`）
- [ ] 按文件扩展名分组统计数量和总大小
- [ ] 显示百分比和 ASCII 进度条
- [ ] 找出最大文件和最近修改的文件
- [ ] 支持 `--ext=js,ts` 参数只统计指定扩展名
- [ ] 文件大小格式化（B/KB/MB）

## 常见坑

1. **`stat` 和 `lstat` 的区别**：`stat` 跟随符号链接，`lstat` 不跟随。遇到符号链接时 `stat` 可能进入死循环，建议用 `withFileTypes` + `isSymbolicLink()` 跳过符号链接。
2. **并发 vs 串行**：对大目录用 `Promise.all` 并发读取更快，但注意不要同时打开太多文件句柄（可能报 `EMFILE` 错误）。
3. **`fs.stat` 在并发下可能遇到竞争**：文件可能在 readdir 和 stat 之间被删除，用 try/catch 包裹。
