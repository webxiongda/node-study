# Day 25 — 数据库事务与优化：验收自测

---

## 题 1（概念）

以下关于事务和性能的说法哪些正确？（多选）

A. PostgreSQL 默认隔离级别是 READ COMMITTED
B. 不可重复读是指同一事务内，两次读同一行结果不同
C. `FOR UPDATE SKIP LOCKED` 适合实现分布式任务队列
D. OFFSET 越小，分页查询越快（OFFSET=0 最快，OFFSET=10000 最慢）
E. Cursor 分页需要数据有唯一且有序的字段

---

## 题 2（分析题）

以下代码有 N+1 问题吗？如果有，如何修复？

```ts
const users = await prisma.user.findMany({ where: { role: 'USER' } });
const result = [];
for (const user of users) {
  const postCount = await prisma.post.count({ where: { authorId: user.id } });
  result.push({ ...user, postCount });
}
```

---

## 题 3（设计题）

解释为什么下面这个实现在高并发下会超卖（库存变负数）：

```ts
async purchaseProduct(productId: number, quantity: number) {
  const product = await this.prisma.product.findUnique({ where: { id: productId } });
  if (product.stock < quantity) throw new Error('库存不足');
  await this.prisma.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
}
```

并给出正确实现。

---

## 题 4（代码题）

实现一个函数：只取文章列表页需要的字段（id/title/slug/createdAt/作者名/评论数），不取 content（大文本），查询要尽可能高效。

---

## 题 5（业务场景）

你的博客 API 在大数据量下（100万篇文章）分页接口变慢，用户反馈「翻到第5000页就很慢」。

1. 问题根源是什么？
2. 如何用 Cursor 分页解决？Cursor 分页有什么限制？

---

## 参考答案

### 题 1：A、B、C、D、E

- A 正确
- B 正确
- C 正确
- D 正确：OFFSET 分页需要数据库扫描并跳过 OFFSET 行，OFFSET 越大越慢
- E 正确：Cursor 必须有唯一且有序的字段（通常是 id 或 createdAt）

### 题 2

有 N+1 问题。`prisma.user.findMany` 返回 N 个用户后，对每个用户各发一次 `prisma.post.count`，共 1+N 次查询。

修复：
```ts
const users = await prisma.user.findMany({
  where: { role: 'USER' },
  include: {
    _count: { select: { posts: true } },
  },
});
const result = users.map(user => ({
  ...user,
  postCount: user._count.posts,
}));
// 共 2 次查询（users + 关联的计数）
```

### 题 3

**竞态条件**：两个并发请求同时读到 `stock = 1`，都通过了 `< quantity` 检查，然后都执行 `decrement: 1`，结果 stock 变为 `-1`（超卖）。

正确实现（用事务 + 条件更新）：
```ts
async purchaseProduct(productId: number, quantity: number) {
  return this.prisma.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: {
        id: productId,
        stock: { gte: quantity },  // 条件更新：库存 >= 数量才更新
      },
      data: { stock: { decrement: quantity } },
    });
    if (updated.count === 0) {
      throw new BadRequestException('库存不足');
    }
  });
}
// updateMany 的条件更新在数据库层面是原子的，无竞态
```

### 题 4

```ts
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    slug: true,
    createdAt: true,
    author: { select: { id: true, name: true } },  // 只取作者名
    _count: { select: { comments: true } },         // 评论数
    // content 不在 select 里，不会取
  },
  where: { status: 'PUBLISHED' },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: 0,
});
```

### 题 5

1. 根源：`LIMIT 20 OFFSET 100000` 需要数据库扫描前 100000 行并丢弃，OFFSET 越大扫描的行越多，查询越慢。即使有索引，也要通过索引遍历前 100000 个条目。

2. Cursor 分页解决方案：
```ts
// 基于上次最后一条的 id 直接定位（不扫描前面的行）
const posts = await prisma.post.findMany({
  take: 20,
  ...(lastId && { skip: 1, cursor: { id: lastId } }),
  orderBy: { id: 'desc' },
});
```

Cursor 分页的限制：
- 不能跳页（只能上一页/下一页）
- 需要有唯一且有索引的排序字段
- 数据删除时可能影响 cursor 的连续性
- 不适合需要「总共 N 页」显示的传统分页 UI
