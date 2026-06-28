# Day 25 — 数据库事务与优化：理论笔记

## 事务隔离级别 ★面试必考

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|------|----------|------|
| READ UNCOMMITTED | ❌ 有 | ❌ 有 | ❌ 有 |
| READ COMMITTED（PG默认）| ✅ 无 | ❌ 有 | ❌ 有 |
| REPEATABLE READ | ✅ 无 | ✅ 无 | ❌ 有（部分） |
| SERIALIZABLE | ✅ 无 | ✅ 无 | ✅ 无 |

**三个异常**：
- **脏读**：读到其他事务未提交的数据
- **不可重复读**：同一事务内两次读同一行结果不同（因为其他事务 UPDATE 并提交）
- **幻读**：同一事务内两次查询结果行数不同（因为其他事务 INSERT/DELETE 并提交）

PostgreSQL 的 REPEATABLE READ 已经防止了大部分幻读，SERIALIZABLE 性能代价最高。

## 数据库锁 ★

```sql
-- 行级共享锁（FOR SHARE）：其他事务可以读，但不能写
SELECT * FROM accounts WHERE id = 1 FOR SHARE;

-- 行级排他锁（FOR UPDATE）：其他事务既不能读（FOR SHARE），也不能写
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

-- 跳过被锁定的行
SELECT * FROM orders WHERE status = 'pending' FOR UPDATE SKIP LOCKED;
-- 用于实现分布式任务队列（避免多个 worker 处理同一任务）
```

**死锁**：A 锁了行1，B 锁了行2，A 等 B 释放行2，B 等 A 释放行1 → 死锁。
**预防**：始终按固定顺序获取锁（如先锁 id 小的行）。

## N+1 问题 ★面试常考

```ts
// N+1 问题（错误做法）
const posts = await prisma.post.findMany();  // 1次查询
for (const post of posts) {
  const comments = await prisma.comment.findMany({ where: { postId: post.id } });
  // N次查询（每篇文章一次）
}
// 共 1+N 次查询

// 正确做法：用 include 批量加载
const posts = await prisma.post.findMany({
  include: { comments: true },  // 2次查询（posts + IN (...) 的 comments）
});
```

**检测 N+1**：开启 Prisma 查询日志：
```ts
const prisma = new PrismaClient({ log: ['query'] });
// 观察控制台，重复出现的相同 SELECT 就是 N+1
```

## 查询优化技巧 ★

### 1. 只取需要的字段

```ts
// 不好：取所有字段（包含 content 大文本）
const posts = await prisma.post.findMany();

// 好：只取列表页需要的字段
const posts = await prisma.post.findMany({
  select: { id: true, title: true, slug: true, createdAt: true },
});
```

### 2. 使用 cursor-based 分页（大数据量）

```ts
// OFFSET 分页的问题：OFFSET 越大，数据库需要扫描越多行
// 第1000页：OFFSET 10000，扫描并丢弃 10000 行

// Cursor 分页：直接定位到上次的位置
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1,                              // 跳过 cursor 本身
  cursor: { id: lastSeenId },           // 从上次最后一条开始
  orderBy: { id: 'asc' },
});
```

### 3. 并行查询

```ts
// 串行（慢）
const posts = await prisma.post.findMany({ where, take: limit });
const total = await prisma.post.count({ where });

// 并行（快，使用事务保证一致性）
const [posts, total] = await prisma.$transaction([
  prisma.post.findMany({ where, take: limit }),
  prisma.post.count({ where }),
]);
```

### 4. 连接池配置

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // DATABASE_URL 里加参数
  // postgresql://user:pass@host/db?connection_limit=10&pool_timeout=10
}
```

```ts
// 或在代码里配置
const prisma = new PrismaClient({
  datasources: {
    db: { url: `${process.env.DATABASE_URL}?connection_limit=10` },
  },
});
```

**连接池大小经验值**：`CPU 核心数 * 2 + 磁盘数`，通常 10-20 足够。过大会增加连接开销，过小会排队等待。

## 面试高频问题

**Q：脏读、不可重复读、幻读是什么？**
脏读：读到其他事务未提交的数据（数据可能会被回滚）；不可重复读：同一事务内两次读同一行结果不同（其他事务 UPDATE 提交了）；幻读：同一事务内两次查询行数不同（其他事务 INSERT/DELETE 提交了）。

**Q：什么是 N+1 问题？如何解决？**
查询 N 条记录后，对每条记录再发一次查询，共 N+1 次。解决：用 ORM 的 include/eager loading 批量加载关联数据（Prisma include、TypeORM relations）；或用 DataLoader 批处理（GraphQL 场景）。

**Q：OFFSET 分页和 Cursor 分页的区别？**
OFFSET 简单但慢（大 OFFSET 时数据库扫描并丢弃大量行），适合数据量小的场景；Cursor 基于上次位置定位，无论翻到哪页都稳定 O(1)，适合无限滚动和大数据量场景。

## 常见易错点

- 使用 READ COMMITTED（默认）时，长事务内重复读可能看到不一样的结果
- `FOR UPDATE SKIP LOCKED` 是实现分布式任务队列的关键，不要用普通的 SELECT 然后 UPDATE
- 连接池太小：大量并发请求等待连接，超时报错
- N+1 藏在嵌套循环里难以发现，开启查询日志帮助检测
