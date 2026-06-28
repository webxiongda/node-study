# Day 32 — Redis 基础：验收自测

## 题 1：数据结构选择

以下场景各适合 Redis 的哪种数据结构？
1. 存储用户 Session 信息（userId, email, roles）
2. 文章浏览量排行榜（Top 10）
3. 限流计数器（1分钟内请求次数）
4. 用户的关注列表（快速判断是否关注）
5. 消息队列（生产者-消费者）

## 题 2：Cache-aside 模式

描述 Cache-aside（旁路缓存）的读写流程，并说明「先删缓存还是先更新数据库」哪个更安全？

## 题 3：代码题

以下缓存代码有什么问题？

```ts
async getPost(id: number) {
  await this.cache.del(`post:${id}`);  // 先删缓存
  const post = await this.prisma.post.findUnique({ where: { id } });
  await this.cache.set(`post:${id}`, post);
  return post;
}
```

## 参考答案

**题 1**：
1. Hash（`HSET user:session:token field value`）
2. ZSet（score=浏览量，member=postId，ZREVRANGE 取 Top 10）
3. String + INCR + EXPIRE（`INCR rate:user:1:60s; EXPIRE ... 60`）
4. Set（`SADD following:userId targetId`，O(1) 判断是否存在）
5. List（RPUSH 入列，LPOP 出列；或用 BullMQ）

**题 2**：
读：查缓存 → 命中则返回 → 未命中则查数据库 → 写缓存 → 返回

写：**先更新数据库，再删缓存**（更安全）
- 先删缓存再更新 DB 的问题：删除后、DB 更新前，另一个线程查询会把旧数据写入缓存，导致缓存长期为旧值
- 先更新 DB 再删缓存：极小概率在 DB 更新和删缓存之间有读操作拿到旧缓存，但下次读会重新从 DB 加载

**题 3**：
这是 `getPost`（读接口），不应该删缓存！读接口只应该查缓存，命中返回，未命中查 DB 再写缓存。删缓存是写/更新接口的职责。现在每次读都会删缓存再重建，缓存完全没有效果（每次都穿透到数据库）。
