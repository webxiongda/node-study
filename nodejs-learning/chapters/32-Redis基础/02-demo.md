# Day 32 — Redis 基础：实操 Demo

## Demo 1：Redis CLI 练习

```bash
# 启动 Redis
redis-server

# 连接
redis-cli

# String 操作
SET greeting "Hello Redis" EX 60
GET greeting
TTL greeting

# 计数器
SET visit_count 0
INCR visit_count
INCR visit_count
GET visit_count  # 2

# Hash（存对象）
HSET user:1 name Alice email alice@example.com age 25
HGETALL user:1
HGET user:1 name

# ZSet（排行榜）
ZADD post:views 1500 "post:1" 3200 "post:2" 800 "post:3"
ZREVRANGE post:views 0 2 WITHSCORES  # Top3 降序
ZINCRBY post:views 100 "post:3"      # post:3 浏览量 +100

# 查看所有 key（生产慎用）
KEYS *
# 生产用 SCAN 代替 KEYS（不阻塞）
SCAN 0 MATCH "post:*" COUNT 10
```

## Demo 2：NestJS 文章缓存

```ts
// src/posts/posts.service.ts（带缓存版）
@Injectable()
export class PostsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private prisma: PrismaService,
  ) {}

  async findOne(id: number) {
    const cacheKey = `post:${id}`;
    
    // 1. 查缓存
    const cached = await this.cache.get<Post>(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] post:${id}`);
      return cached;
    }
    
    // 2. 查数据库
    console.log(`[Cache MISS] post:${id}`);
    const post = await this.prisma.post.findUniqueOrThrow({
      where: { id },
      include: { author: { select: { id: true, name: true } }, tags: true },
    });
    
    // 3. 写缓存（5分钟）
    await this.cache.set(cacheKey, post, 5 * 60 * 1000);
    return post;
  }

  async update(id: number, dto: UpdatePostDto, user: JwtPayload) {
    // ... owner check ...
    const post = await this.prisma.post.update({ where: { id }, data: dto });
    
    // 更新后使缓存失效
    await this.cache.del(`post:${id}`);
    return post;
  }
}
```

## Demo 3：浏览量统计（ZSet 排行榜）

```ts
// src/posts/posts.service.ts
async recordView(postId: number) {
  // Redis 里原子自增文章浏览量
  const viewKey = `post:${postId}:views`;
  const views = await this.redis.incr(viewKey);
  
  // 每100次同步一次到数据库（减少 DB 写入）
  if (views % 100 === 0) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { views },
    });
  }
  
  // 更新排行榜
  await this.redis.zadd('leaderboard:views', views, `post:${postId}`);
  
  return views;
}

async getTopPosts(limit = 10) {
  // ZSet 降序取 Top N
  const ranked = await this.redis.zrevrange('leaderboard:views', 0, limit - 1, 'WITHSCORES');
  return ranked;
}
```
