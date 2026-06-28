# Day 24 — Prisma 迁移与关联：验收自测

---

## 题 1（概念）

以下关于 Prisma 迁移和关联的说法哪些正确？（多选）

A. `onDelete: Cascade` 表示删除父记录时，子记录外键字段被设为 NULL
B. 显式中间表比隐式中间表更适合需要记录关联时间的场景
C. 交互式事务中，如果某个操作抛错，之前的所有操作会自动回滚
D. `set: []` 加 `connect: [...]` 是替换多对多关联的标准方式
E. 在生产环境运行 `prisma migrate dev` 是安全的

---

## 题 2（代码题）

以下事务代码有什么问题？

```ts
const result = await prisma.$transaction(async (tx) => {
  const order = await prisma.order.create({ data: { userId, amount } });
  //                          ^^^^^^ 用的是 prisma，不是 tx
  await prisma.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });
  return order;
});
```

---

## 题 3（实操题）

用 Prisma 实现「替换文章标签」：将文章 ID=1 的标签替换为 `[tagId1, tagId2]`。

---

## 题 4（设计题）

设计一个「用户关注」功能的 Prisma schema（用户可以关注其他用户），需要支持：
- 查询某用户的所有关注者（粉丝）
- 查询某用户关注了哪些人
- 记录关注时间

---

## 题 5（业务场景）

电商平台下单时需要：
1. 检查库存（`products.stock >= quantity`）
2. 减少库存
3. 创建订单记录

这三步必须原子完成。用 Prisma 的交互式事务实现。

---

## 参考答案

### 题 1：B、C、D

- A 错：`onDelete: Cascade` 是级联删除子记录；`SetNull` 才是设为 NULL
- B 正确
- C 正确
- D 正确
- E 错：`prisma migrate dev` 会创建迁移、应用迁移、可能重置数据库，只适合开发环境；生产用 `prisma migrate deploy`

### 题 2

问题：事务里用了 `prisma`（全局客户端）而不是 `tx`（事务上下文）。这些查询不在事务里，如果 `prisma.user.update` 失败，`prisma.order.create` 不会回滚——破坏了原子性。

修复：
```ts
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { userId, amount } });
  await tx.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });
  return order;
});
```

### 题 3

```ts
// 替换标签：先断开所有，再建立新连接
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      set: [],                                    // 断开所有现有标签关联
      connect: [{ id: tagId1 }, { id: tagId2 }], // 建立新关联
    },
  },
});
```

### 题 4

```prisma
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  name        String
  following   Follow[] @relation("Follower")   // 我关注的人
  followers   Follow[] @relation("Following")  // 关注我的人
}

model Follow {
  follower    User     @relation("Follower", fields: [followerId], references: [id], onDelete: Cascade)
  followerId  Int      @map("follower_id")
  following   User     @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)
  followingId Int      @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  @@id([followerId, followingId])
  @@map("follows")
}
```

### 题 5

```ts
async createOrder(userId: number, productId: number, quantity: number) {
  return this.prisma.$transaction(async (tx) => {
    // 1. 查询并锁定库存（FOR UPDATE）
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
    });

    if (product.stock < quantity) {
      throw new BadRequestException('库存不足');
    }

    // 2. 减少库存
    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });

    // 3. 创建订单
    return tx.order.create({
      data: {
        userId,
        items: {
          create: [{
            productId,
            quantity,
            price: product.price,
          }],
        },
        totalAmount: product.price * quantity,
        status: 'PENDING',
      },
    });
  });
}
```
