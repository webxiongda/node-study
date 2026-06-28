# Day 24 — Prisma 迁移与关联：实操 Demo

## Demo 1：迁移演练

```bash
# 场景：为 Post 添加 excerpt（摘要）字段

# Step 1：修改 schema
# model Post {
#   ...
#   excerpt String?  ← 先可选
# }

# Step 2：创建迁移
npx prisma migrate dev --name add-post-excerpt

# 生成的 SQL（migrations/xxx_add_post_excerpt/migration.sql）：
# ALTER TABLE "posts" ADD COLUMN "excerpt" TEXT;

# Step 3：填充现有数据
npx prisma db execute --stdin <<EOF
UPDATE posts SET excerpt = LEFT(content, 200) WHERE excerpt IS NULL;
EOF

# Step 4：后续如果需要 NOT NULL，再次修改 schema 并迁移
# excerpt String  ← 去掉 ?
# npx prisma migrate dev --name make-excerpt-required
```

---

## Demo 2：显式多对多中间表

```prisma
// schema.prisma 新增
model PostTag {
  post    Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId  Int      @map("post_id")
  tag     Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  tagId   Int      @map("tag_id")
  addedAt DateTime @default(now()) @map("added_at")

  @@id([postId, tagId])
  @@map("post_tags")
}

// 同时修改 Post 和 Tag
model Post {
  postTags PostTag[]
}
model Tag {
  postTags PostTag[]
}
```

```ts
// 查询文章及其标签（通过显式中间表）
const postWithTags = await prisma.post.findUnique({
  where: { id: 1 },
  include: {
    postTags: {
      include: { tag: true },
      orderBy: { addedAt: 'asc' },
    },
  },
});

// 提取标签列表
const tags = postWithTags?.postTags.map(pt => pt.tag);

// 添加标签（不重复）
await prisma.postTag.upsert({
  where: { postId_tagId: { postId: 1, tagId: 3 } },
  update: {},  // 已存在则不做任何事
  create: { postId: 1, tagId: 3 },
});
```

---

## Demo 3：交互式事务（扣款 + 创建订单）

```ts
// src/orders/orders.service.ts
async createOrder(userId: number, amount: number, items: OrderItem[]) {
  return this.prisma.$transaction(async (tx) => {
    // 1. 查询并锁定用户（防止并发超卖）
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.balance < amount) {
      throw new BadRequestException('余额不足');  // 自动触发回滚
    }

    // 2. 扣减余额
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    // 3. 创建订单
    const order = await tx.order.create({
      data: {
        userId,
        amount,
        status: 'PENDING',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    return order;
    // 所有操作都成功才提交，任何一个失败都全部回滚
  });
}
```
