# Day 24 — Prisma 迁移与关联：理论笔记

## 迁移策略 ★

### 安全迁移 vs 危险迁移

```prisma
// 安全操作（向后兼容）
model Post {
  viewCount Int @default(0)  // ✅ 添加新字段（有默认值）
}

// 危险操作
model Post {
  // title String  →  删除字段（已有数据丢失）
  // email String → email String @unique  →  加唯一约束（如有重复值会失败）
  // type String → type PostType（enum）  → 类型转换（可能失败）
}
```

**生产环境迁移原则**：
1. 先加字段（允许 NULL 或有默认值）
2. 应用部署后再填充数据
3. 再加约束（NOT NULL / UNIQUE）
4. 旧字段最后删除（确认没有代码引用后）

### 添加字段迁移示例

```bash
# 1. 修改 schema，添加字段
# model Post { excerpt String? }  ← 先可选（允许 NULL）

# 2. 创建迁移
npx prisma migrate dev --name add-post-excerpt

# 3. 填充现有数据
UPDATE posts SET excerpt = LEFT(content, 200) WHERE excerpt IS NULL;

# 4. 如果需要 NOT NULL，再创建新迁移修改约束
```

## 关联关系 ★

### 一对多（1:N）

```prisma
model User {
  posts Post[]  // 一个用户有多篇文章
}

model Post {
  author   User @relation(fields: [authorId], references: [id])
  authorId Int  @map("author_id")
}
```

### 多对多（M:N）

**隐式中间表**（Prisma 自动管理）：
```prisma
model Post {
  tags Tag[] @relation("PostToTag")
}
model Tag {
  posts Post[] @relation("PostToTag")
}
// Prisma 自动创建 _PostToTag 中间表
```

**显式中间表**（有额外字段时使用）：
```prisma
model Post {
  postTags PostTag[]
}
model Tag {
  postTags PostTag[]
}
model PostTag {
  post      Post     @relation(fields: [postId], references: [id])
  postId    Int
  tag       Tag      @relation(fields: [tagId], references: [id])
  tagId     Int
  addedAt   DateTime @default(now())  // 额外字段，隐式中间表做不到

  @@id([postId, tagId])  // 复合主键
}
```

### 自关联（树形结构）

```prisma
model Category {
  id       Int        @id @default(autoincrement())
  name     String
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId Int?
  children Category[] @relation("CategoryTree")
}
```

### onDelete 策略

```prisma
// Cascade：删除父记录时，级联删除子记录
author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

// SetNull：删除父记录时，子记录的外键设为 NULL
author User? @relation(fields: [authorId], references: [id], onDelete: SetNull)

// Restrict：存在子记录时，禁止删除父记录
author User @relation(fields: [authorId], references: [id], onDelete: Restrict)

// NoAction（默认）：数据库层面不处理，交给应用层
```

## 嵌套写入 ★

```ts
// 创建文章时同时关联已有标签 + 创建新标签
const post = await prisma.post.create({
  data: {
    title: '新文章',
    content: '...',
    authorId: 1,
    tags: {
      connect: [{ id: 1 }, { id: 2 }],          // 关联已有标签
      connectOrCreate: [{                         // 存在则关联，不存在则创建
        where: { slug: 'typescript' },
        create: { name: 'TypeScript', slug: 'typescript' },
      }],
    },
  },
  include: { tags: true },
});

// 更新时同步标签（先断开所有，再建立新连接）
const updated = await prisma.post.update({
  where: { id: postId },
  data: {
    tags: {
      set: [],                       // 断开所有现有关联
      connect: newTagIds.map(id => ({ id })),  // 建立新关联
    },
  },
});

// 创建用户同时创建其文章（嵌套创建）
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    passwordHash: '...',
    posts: {
      create: [
        { title: '第一篇', content: '...', slug: 'first-post' },
      ],
    },
  },
  include: { posts: true },
});
```

## Prisma 事务 ★

```ts
// 方法1：批处理事务（并行，不保证顺序）
const [posts, total] = await prisma.$transaction([
  prisma.post.findMany({ skip: 0, take: 10 }),
  prisma.post.count(),
]);

// 方法2：交互式事务（有顺序依赖时使用）
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.balance < amount) throw new Error('余额不足');  // 抛错则自动回滚
  await tx.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } });
  return tx.order.create({ data: { userId, amount, status: 'COMPLETED' } });
});
```

## 面试高频问题

**Q：Prisma 隐式多对多和显式多对多的区别？**
隐式：Prisma 自动管理中间表，简单场景使用；显式：手动定义中间表 Model，适合中间表需要额外字段（如关联时间、排序权重）的场景。

**Q：`$transaction` 的两种用法有什么区别？**
批处理 `$transaction([q1, q2])` 并行执行，适合无依赖的并行查询（如分页的 findMany + count）；交互式 `$transaction(async tx => {...})` 串行执行，适合有顺序依赖的操作，抛错自动回滚。

**Q：生产环境如何安全地添加 NOT NULL 字段？**
三步走：(1) 先加可空字段 `field String?`；(2) 填充所有现有记录的值；(3) 再加 NOT NULL 约束。一步到位的 `field String @default('')` 也可以，但需要评估默认值是否合适。

## 常见易错点

- 显式中间表必须用复合主键 `@@id([a, b])`，否则可能重复关联
- `onDelete: SetNull` 时，外键字段必须是可空的（`Int?`）
- 交互式事务里要用 `tx` 而不是 `prisma`，否则这些操作不在事务里
- 多对多 `set: []` 会断开所有关联，用于替换标签时要先 set 再 connect
