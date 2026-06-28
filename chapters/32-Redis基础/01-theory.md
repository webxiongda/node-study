# Day 32 — Redis 基础：理论笔记

## Redis 是什么？

Redis 是内存数据库（也支持持久化），单线程处理命令，高性能（10万+ QPS）。主要用途：缓存、Session 存储、消息队列、排行榜、限流。

## 核心数据结构 ★

### String
```bash
SET key value EX 3600    # 设置字符串，过期 3600 秒
GET key
INCR counter             # 原子自增（计数器、限流）
INCRBY counter 5
SETNX key value          # 不存在时才设置（分布式锁）
```

### Hash（对象存储）
```bash
HSET user:1 name Alice email alice@example.com
HGET user:1 name
HGETALL user:1
HMSET user:1 name Bob age 25
```

### List（队列/栈）
```bash
RPUSH queue task1 task2  # 尾部入列
LPOP queue               # 头部出列（队列）
RPOP queue               # 尾部出列（栈）
LRANGE queue 0 -1        # 查看全部
```

### Set（无序唯一集合）
```bash
SADD tags:post:1 nodejs nestjs
SMEMBERS tags:post:1
SISMEMBER tags:post:1 nodejs  # 判断是否存在
SINTER tags:post:1 tags:post:2  # 交集
```

### ZSet（有序集合，排行榜）★
```bash
ZADD leaderboard 100 alice 200 bob 150 carol  # 添加（score, member）
ZRANGE leaderboard 0 -1 WITHSCORES          # 升序
ZREVRANGE leaderboard 0 9 WITHSCORES        # 降序 Top10
ZINCRBY leaderboard 10 alice               # score += 10
ZRANK leaderboard alice                    # 排名（0开始）
```

## 过期和持久化

```bash
EXPIRE key 3600          # 设置过期（秒）
TTL key                  # 查看剩余过期时间（-1=永不，-2=不存在）
PERSIST key              # 取消过期
```

**持久化**：RDB（定期快照）和 AOF（追加写操作日志）。生产一般两者都开。

## NestJS 集成 ★

```bash
pnpm add @nestjs/cache-manager cache-manager @keyv/redis
```

```ts
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [new KeyvRedis(config.get('REDIS_URL'))],
        ttl: 60000,  // 默认 60 秒
      }),
    }),
  ],
})
export class AppModule {}
```

**使用 CacheManager**：
```ts
@Injectable()
export class PostsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private prisma: PrismaService,
  ) {}

  async findOne(id: number) {
    const cacheKey = `post:${id}`;
    const cached = await this.cache.get<Post>(cacheKey);
    if (cached) return cached;

    const post = await this.prisma.post.findUniqueOrThrow({ where: { id } });
    await this.cache.set(cacheKey, post, 300000);  // 缓存 5 分钟
    return post;
  }

  async update(id: number, dto: UpdatePostDto) {
    const post = await this.prisma.post.update({ where: { id }, data: dto });
    await this.cache.del(`post:${id}`);  // 更新后删除缓存
    return post;
  }
}
```

**@CacheKey + @CacheTTL 装饰器（Controller 级）**：
```ts
@CacheKey('all_posts')
@CacheTTL(60000)
@Get()
findAll() {}
```

## 面试高频问题

**Q：Redis 为什么快？**
(1) 数据存内存，读写不需要磁盘 I/O；(2) 单线程处理命令，无锁竞争；(3) 高效的数据结构；(4) 非阻塞 I/O（epoll/kqueue）处理网络连接。

**Q：Redis 和 Memcached 的区别？**
Redis 支持丰富数据结构（String/Hash/List/Set/ZSet）、持久化、发布订阅、Lua 脚本；Memcached 只支持 String，无持久化，但极简高速适合简单 KV 缓存。

**Q：Redis 是单线程的吗？**
命令处理是单线程（6.0 之前），所以命令间不会有竞争条件；I/O 处理在 6.0 后引入了多线程。单线程模型简化了设计，加上内存操作本身很快，不是性能瓶颈。

## 常见易错点

- `INCR` 是原子的，但 `GET + SET` 不是（需要用 `SETNX` 或 Lua 脚本）
- Key 命名规范：`{类型}:{id}`（如 `post:1`、`user:1:profile`）
- 忘了设置 TTL → 内存无限增长
- `cache.del()` 清缓存要在写操作之后（先写库再删缓存，而不是先删缓存）
