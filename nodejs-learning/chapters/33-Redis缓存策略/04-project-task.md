# Day 33 — 项目任务：博客 API 缓存加固

## 任务

在 Day 32 缓存基础上，针对三大问题进行防护加固：

1. **防穿透**：`GET /posts/:id` 对不存在的 ID 返回空值缓存（TTL 1分钟）
2. **防击穿**：为热点文章详情接口添加互斥锁保护
3. **防雪崩**：`findAll` 接口批量缓存时给 TTL 加随机抖动（±20%）
4. **监控日志**：在命中缓存/穿透/击穿情况下打印不同级别日志

## 验收

```bash
# 测试防穿透
curl http://localhost:3000/posts/999999
# 控制台：[Cache MISS - NOT FOUND] post:999999
# 再次请求：[Cache HIT - NULL] post:999999（不再查 DB）

# 验证空值缓存
redis-cli GET post:999999      # 返回 "NULL"
redis-cli TTL post:999999      # 约 60 秒

# 测试 TTL 随机化
# 先缓存几篇文章
curl http://localhost:3000/posts/1
curl http://localhost:3000/posts/2
curl http://localhost:3000/posts/3

# 查看 TTL 差异
redis-cli TTL post:1
redis-cli TTL post:2
redis-cli TTL post:3
# TTL 应该各不相同（不完全一致）
```
