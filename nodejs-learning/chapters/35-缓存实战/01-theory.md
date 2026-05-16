# Day 35 — 缓存实战：理论笔记

## 缓存架构总览

完整的缓存体系包含三个层次：

```
请求 → 本地缓存（L1，进程内Map/LRU）
     → Redis 缓存（L2，分布式）
     → 数据库（DB）
```

多级缓存的好处：Redis 宕机时 L1 兜底；L1 命中无网络延迟。

---

## 文章系统缓存设计

### Key 命名规范

```
post:{id}              # 文章详情
post:list:{page}:{limit}   # 文章列表（带分页）
post:{id}:views        # 浏览量计数
leaderboard:views      # 浏览量排行榜（ZSet）
user:{id}:profile      # 用户信息
```

### TTL 规划

| 数据 | TTL | 理由 |
|------|-----|------|
| 文章详情 | 5分钟+抖动 | 内容变化不频繁 |
| 文章列表 | 1分钟 | 新文章发布需较快刷新 |
| 用户信息 | 10分钟 | 变化很少 |
| 浏览量 | 永不过期 | 计数用，手动管理 |
| 不存在的 key | 1分钟 | 防穿透，快速失效 |

---

## 缓存更新时机

### 写文章（Create）
```
1. 插入 DB
2. 删除列表缓存（post:list:*，分页可能变化）
3. 通知关注者（入队 BullMQ）
```

### 更新文章（Update）
```
1. 先更新 DB
2. 删除该文章详情缓存（post:{id}）
3. 删除列表缓存（因为列表里有摘要字段）
```

### 删除文章（Delete）
```
1. 先删 DB
2. 删除详情缓存
3. 删除浏览量缓存
4. 删除列表缓存
```

---

## 浏览量统计最佳实践

```
用户访问文章
   ↓
Redis INCR post:{id}:views（原子自增）
   ↓
ZINCRBY leaderboard:views（更新排行榜）
   ↓
每 100 次或定时（比如每分钟）→ 同步到数据库
```

**为什么不每次都写 DB？**  
文章被访问1000次，如果每次都 `UPDATE post SET views = views + 1`，DB 写压力极大。用 Redis INCR 批量累积，定期同步，DB 写次数降低百倍。

---

## BullMQ + 缓存协同

```ts
// 文章发布流程
async publishPost(id: number) {
  // 1. 更新 DB
  await this.prisma.post.update({ where: { id }, data: { published: true } });
  
  // 2. 更新缓存（发布状态变了，删详情缓存）
  await this.cache.del(`post:${id}`);
  
  // 3. 通知关注者（异步，不阻塞当前请求）
  await this.notifyQueue.add('post-published', { postId: id });
  
  // 4. 预热缓存（高流量场景，主动加载）
  const post = await this.prisma.post.findUnique({ where: { id } });
  await this.cache.set(`post:${id}`, post, this.getTTL());
}
```

---

## 面试高频问题

**Q：如何清除文章列表缓存（有多页）？**  
方案1：用 `SCAN` 匹配 `post:list:*` 然后批量删除（生产可用）。  
方案2：给列表缓存加版本号 `post:list:v3:1:20`，更新时版本号+1，旧缓存自然过期。  
方案3：列表缓存 TTL 设短一点（1分钟），接受最终一致。

**Q：浏览量同步数据库的时机怎么选？**  
常见策略：每N次同步（`views % 100 === 0`）+ 定时任务兜底（每分钟强制同步未达N次的）。

**Q：缓存数据和数据库数据不一致怎么办？**  
短 TTL 自然过期 + 写后立即删缓存，是工程上最常用的最终一致方案。强一致场景用分布式锁或事务性消息。
