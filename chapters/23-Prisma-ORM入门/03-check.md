# Day 23 — Prisma ORM 入门：验收自测

---

## 题 1（概念）

以下关于 Prisma 的说法哪些正确？（多选）

A. Prisma Client 是从 schema 自动生成的，修改 schema 后需要重新运行 `prisma generate`
B. `select` 和 `include` 可以在同一个查询的同一层同时使用
C. `findUnique` 只能用 `@id` 或 `@unique` 字段查询
D. `findUniqueOrThrow` 找不到记录时抛 `PrismaClientKnownRequestError`
E. Prisma migrate 的迁移文件可以安全地手动修改

---

## 题 2（代码题）

以下 Prisma 查询有什么问题？

```ts
const user = await prisma.user.findUnique({
  where: { name: 'Alice' },  // name 不是 @unique 字段
});
```

---

## 题 3（实操题）

用 Prisma 实现：查询指定用户的所有已发布文章，包含标签，按创建时间降序，分页。

```ts
async getUserPosts(userId: number, page: number, limit: number) {
  // 实现
}
```

---

## 题 4（代码题）

如何用 Prisma 实现「原子性地更新文章浏览数（不用先查再加）」？

---

## 题 5（业务场景）

Prisma 查询出现了 N+1 问题：

```ts
// 有 50 篇文章
const posts = await prisma.post.findMany();

// 对每篇文章分别查作者（N+1：50次额外查询）
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
  console.log(post.title, author?.name);
}
```

如何用 Prisma 解决这个 N+1 问题？

---

## 参考答案

### 题 1：A、C、D

- A 正确：`prisma generate` 基于当前 schema 重新生成 Client
- B 错：`select` 和 `include` 在同一层互斥，只能选一个
- C 正确：`findUnique` 的 `where` 只接受 `@id` 或 `@unique` 字段
- D 正确：抛 `PrismaClientKnownRequestError`，code 为 `P2025`
- E 错：手动修改迁移文件风险极高，可能导致迁移状态不一致；应该通过新迁移来修改

### 题 2

`name` 字段没有 `@unique` 约束，不能用在 `findUnique` 的 `where` 里。TypeScript 编译时就会报错（这是 Prisma 类型安全的体现）。

解决方案：
```ts
// 方案1：用 findFirst（返回第一个匹配）
const user = await prisma.user.findFirst({ where: { name: 'Alice' } });

// 方案2：给 name 加 @unique 约束（业务允许的话）
```

### 题 3

```ts
async getUserPosts(userId: number, page: number, limit: number) {
  const [data, total] = await this.prisma.$transaction([
    this.prisma.post.findMany({
      where: { authorId: userId, status: 'PUBLISHED' },
      include: { tags: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.post.count({
      where: { authorId: userId, status: 'PUBLISHED' },
    }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
```

### 题 4

```ts
// 原子增量，不需要先查再加，无竞态条件
const post = await prisma.post.update({
  where: { id: postId },
  data: { views: { increment: 1 } },
});
```

### 题 5

```ts
// 解决方案：用 include 一次性查出所有关联数据（1次 JOIN 查询）
const posts = await prisma.post.findMany({
  include: {
    author: { select: { id: true, name: true } },  // 一次查询搞定
  },
});

for (const post of posts) {
  console.log(post.title, post.author.name);  // 直接访问，没有额外查询
}
// 总计：2次查询（posts + 关联的 users）而不是 N+1
```

Prisma 通过 `include` 使用 `IN` 查询批量加载关联数据，不是为每条记录单独发一次查询。
