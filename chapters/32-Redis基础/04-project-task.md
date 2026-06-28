# Day 32 — 项目任务：博客 API 接入 Redis 缓存

## 任务

1. 安装并启动 Redis，配置 `REDIS_URL` 环境变量
2. 集成 `@nestjs/cache-manager` + Redis store
3. 文章详情接口加缓存（TTL 5分钟）
4. 文章更新/删除时清除对应缓存
5. 实现文章浏览量统计（Redis INCR）

## 验收

```bash
# 第一次请求（Cache MISS，控制台有日志）
curl http://localhost:3000/posts/1

# 第二次请求（Cache HIT，速度更快）
curl http://localhost:3000/posts/1

# Redis CLI 验证
redis-cli GET post:1  # 应该有缓存数据

# 更新文章后缓存失效
curl -X PATCH http://localhost:3000/posts/1 \
  -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' \
  -d '{"title":"更新后的标题"}'

redis-cli GET post:1  # 应该返回 nil（缓存已清除）
```
