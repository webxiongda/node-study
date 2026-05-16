# Day 32 — Redis 基础：复习文档

## 核心知识点总结

### 五大数据结构速查

| 结构 | 命令 | 适用场景 |
|------|------|---------|
| String | SET/GET/INCR/SETNX | 计数器、限流、分布式锁、简单缓存 |
| Hash | HSET/HGET/HGETALL | 用户 Session、对象存储 |
| List | RPUSH/LPOP/LRANGE | 消息队列、最近记录 |
| Set | SADD/SMEMBERS/SISMEMBER | 关注列表、去重、交并差集 |
| ZSet | ZADD/ZREVRANGE/ZINCRBY | 排行榜、带权重优先队列 |

### Cache-aside 读写流程

**读**：查缓存 → 命中返回 → 未命中查 DB → 写缓存 → 返回  
**写**：先更新 DB → 再删缓存（安全顺序，不能反）

### NestJS 集成三件套

```bash
pnpm add @nestjs/cache-manager cache-manager @keyv/redis
```

注册 `CacheModule.registerAsync({ stores: [new KeyvRedis(url)] })`  
注入 `@Inject(CACHE_MANAGER) private cache: Cache`  
使用 `cache.get / cache.set / cache.del`

## 易错点整理

1. **先删缓存再更新 DB**：高并发下会导致旧数据写回缓存，必须先写 DB 再删缓存
2. **忘设 TTL**：内存无限增长，线上必须每个 key 都有 TTL
3. **KEYS * 阻塞**：生产环境禁止，改用 `SCAN`
4. **读接口删缓存**：`getPost` 只应查缓存→查 DB→写缓存，不能在读时删缓存
5. **GET + SET 不原子**：需要原子操作时用 `SETNX` 或 Lua 脚本

## 高频面试题

**Q1：Redis 为什么快？**  
内存读写（无磁盘 I/O）+ 单线程命令处理（无锁竞争）+ epoll 非阻塞 I/O + 高效数据结构。

**Q2：Redis 单线程如何保证高并发？**  
单线程只用于命令处理，网络 I/O 用 epoll 多路复用。内存操作本身极快（纳秒级），不需要多线程。

**Q3：如何选择 Redis 数据结构？**  
- 简单键值/计数器 → String；  
- 对象多字段 → Hash；  
- 有序/排行 → ZSet；  
- 快速判断存在性/去重 → Set；  
- 消息/任务队列 → List。

**Q4：Cache-aside 模式写操作为什么先更新 DB 再删缓存？**  
如果先删缓存，在 DB 更新前的窗口期，其他线程查询会把旧数据写回缓存，导致缓存长期脏数据。先更新 DB 再删缓存，脏数据窗口极小（只有极低概率的并发读），且下次读会重建缓存。

**Q5：Redis 持久化 RDB 和 AOF 的区别？**  
RDB：定期生成快照，恢复快但会丢失最近数据；  
AOF：追加每条写命令，数据更完整但文件大恢复慢。  
生产：两者都开，RDB 用于快速恢复，AOF 用于数据安全。

**Q6：INCR 为什么是原子的？**  
Redis 是单线程处理命令，INCR 是一个命令，不会被其他命令中断，天然原子。

## 自测题（不看答案作答）

1. 用 Redis 实现「每用户每分钟限制 100 次请求」，用哪个数据结构和命令？写出 key 设计。
2. 更新文章后如何正确清除缓存？在代码的哪个位置调用 `cache.del`？
3. `TTL key` 返回 -1 和 -2 分别代表什么？
4. 文章浏览量排行榜 Top10，用什么命令查询？
5. 为什么生产环境禁止 `KEYS *`？

## 下一章学习建议

Day 33 重点：缓存穿透（查不存在的 key 击穿 DB）、缓存击穿（热点 key 过期瞬间大量请求）、缓存雪崩（大量 key 同时过期）三大经典问题及解决方案。面试必考，要能画出时序图解释。
