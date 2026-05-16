# Day 33 — Redis 缓存策略：实操 Demo

## Demo 1：缓存空值防穿透

```ts
// src/posts/posts.service.ts
async findOne(id: number) {
  const cacheKey = `post:${id}`;
  
  // 1. 查缓存
  const cached = await this.cache.get<string>(cacheKey);
  if (cached !== undefined && cached !== null) {
    if (cached === 'NULL') return null; // 空值命中
    return cached;
  }
  
  // 2. 查数据库
  const post = await this.prisma.post.findUnique({ where: { id } });
  
  if (!post) {
    // 3. 缓存空值（1分钟，防穿透）
    await this.cache.set(cacheKey, 'NULL', 60 * 1000);
    return null;
  }
  
  // 4. 缓存真实数据（5分钟）
  await this.cache.set(cacheKey, post, 5 * 60 * 1000);
  return post;
}
```

**验证**：
```bash
# 请求不存在的 ID
curl http://localhost:3000/posts/9999
# 第一次：DB 查询，写入 "NULL"
# 第二次：缓存命中 "NULL"，DB 不会被查

# Redis 验证
redis-cli GET post:9999  # 应该返回 "NULL" 字符串
redis-cli TTL post:9999  # 应该有约60秒的剩余TTL
```

---

## Demo 2：互斥锁防缓存击穿

```ts
// src/common/redis-lock.ts
@Injectable()
export class RedisLockService {
  constructor(@InjectRedis() private redis: Redis) {}

  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    ttl = 10,
  ): Promise<T> {
    const acquired = await this.redis.set(lockKey, '1', 'NX', 'EX', ttl);
    
    if (!acquired) {
      // 未获取锁，等待100ms后重试（最多重试5次）
      await new Promise(r => setTimeout(r, 100));
      return this.withLock(lockKey, fn, ttl);
    }
    
    try {
      return await fn();
    } finally {
      await this.redis.del(lockKey);
    }
  }
}

// src/posts/posts.service.ts
async findOneWithLock(id: number) {
  const cacheKey = `post:${id}`;
  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  return this.lockService.withLock(`lock:${cacheKey}`, async () => {
    // 双重检查（拿到锁后再查一次缓存）
    const recheck = await this.cache.get(cacheKey);
    if (recheck) return recheck;
    
    const post = await this.prisma.post.findUniqueOrThrow({ where: { id } });
    await this.cache.set(cacheKey, post, 5 * 60 * 1000);
    return post;
  });
}
```

---

## Demo 3：TTL 随机化防雪崩

```ts
// src/posts/posts.service.ts
private getCacheTTL(baseTtlMs: number): number {
  // 基础TTL + 随机抖动（±20%）
  const jitter = baseTtlMs * 0.2 * (Math.random() - 0.5) * 2;
  return Math.floor(baseTtlMs + jitter);
}

async cacheAllPosts(posts: Post[]) {
  const BASE_TTL = 5 * 60 * 1000; // 5分钟基础TTL
  
  await Promise.all(
    posts.map(post =>
      this.cache.set(`post:${post.id}`, post, this.getCacheTTL(BASE_TTL))
    )
  );
}
```

**验证思路**：
```bash
# 查看多个 key 的 TTL，应该各不相同
redis-cli TTL post:1
redis-cli TTL post:2
redis-cli TTL post:3
# 每个 TTL 在 240~360 秒之间（5分钟±1分钟）
```

---

## Demo 4：Redis CLI 模拟三大问题

```bash
# 模拟缓存穿透：不存在的 key
redis-cli EXISTS post:999999  # 返回 0

# 模拟击穿：设置一个即将过期的 key
redis-cli SET post:1 '{"id":1,"title":"test"}' EX 5
redis-cli TTL post:1  # 倒计时5秒
# 5秒后大量请求同时打到 DB（本地用 ab 或 wrk 工具测试）

# 模拟雪崩：查看多个 key 是否同时过期
redis-cli DEBUG SLEEP 0  # 不 sleep，只是示意
redis-cli TTL post:1
redis-cli TTL post:2
# 如果 TTL 完全一致，说明没有做随机化，雪崩风险高
```
