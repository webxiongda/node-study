# Day 04 — 项目任务：流式日志处理器

## 业务背景

生产服务器每天产生数 GB 的 JSON 格式日志文件，需要一个工具流式分析日志，统计各接口的错误率和平均响应时间，不能把整个文件载入内存。

## 技术要求

- 使用 `readline` + `createReadStream` 流式读取
- 使用 EventEmitter 上报进度事件
- 不允许安装第三方包

## 日志格式（每行一个 JSON）

```json
{"timestamp":"2026-05-16T10:23:45Z","method":"GET","path":"/api/users","status":200,"duration":45}
{"timestamp":"2026-05-16T10:23:46Z","method":"POST","path":"/api/login","status":401,"duration":12}
{"timestamp":"2026-05-16T10:23:47Z","method":"GET","path":"/api/users","status":500,"duration":200}
```

## 输入输出

```bash
node log-analyzer.js access.log
```

**期望输出：**
```
分析完成，共处理 12,847 行

接口统计:
路径                   请求数   成功率    平均响应(ms)   P99(ms)
GET /api/users          4,231   98.2%     45            320
POST /api/login         2,109   94.7%     23            180
GET /api/posts          3,456   99.1%     67            410
...

Top 5 慢接口（P99）:
1. POST /api/upload      850ms
2. GET /api/report       620ms
...
```

## 验收标准

- [ ] 流式读取，内存占用不随文件大小增长
- [ ] 统计每个 `method + path` 组合的：总请求数、成功率（status < 400）、平均响应时间
- [ ] 计算 P99 响应时间（不能把所有 duration 存数组，要用近似算法或分桶）
- [ ] 每处理 10,000 行触发一次 `progress` 事件，输出进度百分比
- [ ] 处理 JSON 解析错误（跳过损坏的行）

## 常见坑

1. **P99 计算**：精确 P99 需要存所有数据，内存不可接受。用分桶法（histogram）：维护一个 `[0-10ms, 10-50ms, 50-100ms, ...]` 的桶，近似计算百分位数。
2. **readline 按行分割**：`readline.createInterface` 已经处理好了换行符，直接监听 `line` 事件即可。
3. **Map vs 对象**：接口路径作为 key 用 `Map` 更安全（避免 `__proto__` 等特殊 key 污染）。
