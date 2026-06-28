# Day 33 — Redis 缓存策略：理论笔记

## 三大缓存问题 ★★★

### 1. 缓存穿透（Cache Penetration）

**定义**：查询一个数据库中**不存在**的 key，每次都穿透缓存打到数据库。  
**危害**：恶意请求用大量不存在的 ID 攻击，DB 被打垮。

**解决方案**：

**方案 A：缓存空值**
```ts
const data = await db.findById(id);
if (!data) {
  await cache.set(`post:${id}`, 'NULL', 60 * 1000); // 空值缓存1分钟
  return null;
}
```

**方案 B：布隆过滤器（BloomFilter）**
- 启动时把所有合法 ID 加入布隆过滤器
- 请求进来先过布隆过滤器，不存在的直接拦截
- 误判率可调（有误判但无漏判），比空值缓存更省内存

```ts
// 伪代码：布隆过滤器
const bloom = new BloomFilter(10000, 0.01); // 容量1万，误判率1%
await bloom.add(existingIds);

async function getPost(id: number) {
  if (!bloom.has(id)) return null; // 快速拦截
  // ... 正常查缓存→DB 流程
}
```

---

### 2. 缓存击穿（Cache Breakdown）

**定义**：某个**热点 key** 过期瞬间，大量并发请求同时穿透到数据库。  
**危害**：DB 在极短时间内承受巨大压力，可能雪崩。

**解决方案**：

**方案 A：互斥锁（Mutex Lock）**
```ts
async getPost(id: number) {
  const cacheKey = `post:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // 用 SETNX 获取分布式锁
  const lockKey = `lock:${cacheKey}`;
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  
  if (!acquired) {
    // 未拿到锁，等待后重试
    await sleep(100);
    return this.getPost(id);
  }
  
  try {
    const post = await db.findById(id);
    await cache.set(cacheKey, post, 5 * 60 * 1000);
    return post;
  } finally {
    await redis.del(lockKey);
  }
}
```

**方案 B：逻辑过期（不设物理 TTL）**  
- key 永不过期，但 value 里存一个 `logicExpire` 字段
- 读到 value 且已逻辑过期时，异步重建缓存，本次返回旧数据
- 优点：无击穿，缺点：短暂返回旧数据（弱一致性）

---

### 3. 缓存雪崩（Cache Avalanche）

**定义**：大量 key 在**同一时间**集中过期，或 Redis 宕机，导致大量请求打到数据库。

**解决方案**：

**方案 A：TTL 随机化**
```ts
// 基础5分钟 + 0~2分钟随机抖动
const ttl = 5 * 60 * 1000 + Math.random() * 2 * 60 * 1000;
await cache.set(key, value, ttl);
```

**方案 B：Redis 高可用（哨兵/集群）**  
Redis Sentinel 自动故障转移，集群模式分片 + 副本。

**方案 C：多级缓存**  
本地缓存（L1）→ Redis（L2）→ 数据库。Redis 宕机时 L1 还能扛一部分。

**方案 D：熔断降级**  
DB 压力过大时，直接返回兜底数据或错误，保护数据库。

---

## 缓存更新策略对比 ★

| 策略 | 写操作 | 一致性 | 复杂度 | 适用场景 |
|------|-------|-------|-------|---------|
| Cache-aside | 更新 DB → 删缓存 | 最终一致 | 中 | 读多写少（最常用） |
| Write-through | 同时写 DB + 缓存 | 强一致 | 高 | 写多读多 |
| Write-behind | 先写缓存，异步写 DB | 弱一致 | 高 | 高写吞吐（日志、计数） |
| Read-through | 缓存自动从 DB 加载 | 最终一致 | 低（框架支持） | 简单场景 |

---

## 热点 Key 问题

**症状**：单个 key 请求量极大，Redis 单线程成为瓶颈。  
**解决**：
- 本地缓存（内存级，避免网络）
- key 拆分：`hot:product:1:shard:{0-9}`，请求随机打到某个 shard

---

## 面试高频问题

**Q：缓存穿透、击穿、雪崩怎么区分？**  
- 穿透：key 根本不存在（查鬼）
- 击穿：热点 key 过期瞬间（锁门瞬间冲进来）
- 雪崩：大量 key 集中过期 或 Redis 宕机（集体失效）

**Q：如何保证缓存和数据库的一致性？**  
最常用：先更新 DB，再删缓存（Cache-aside），配合短 TTL 兜底。  
强一致场景：分布式事务或消息队列异步更新。

**Q：为什么不能先删缓存再更新 DB？**  
删缓存后、DB 更新前，其他线程查询会把旧数据写回缓存，产生长期脏数据。

**Q：布隆过滤器有什么局限？**  
只能判断「可能存在」或「一定不存在」，有误判率（假阳性），且不支持删除（标准版）。适合用在拦截不存在 key 的场景。
