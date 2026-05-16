# Day 25 — 数据库事务与优化：实操 Demo

## Demo 1：事务隔离级别实验

```sql
-- 开两个 psql 终端，观察不同隔离级别的效果

-- 终端1（事务A）
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 假设 balance = 1000

-- 终端2（事务B）
UPDATE accounts SET balance = 900 WHERE id = 1;
COMMIT;  -- 提交

-- 终端1（事务A，READ COMMITTED 隔离级别下）
SELECT balance FROM accounts WHERE id = 1;  -- 读到 900（不可重复读）
COMMIT;

-- 改用 REPEATABLE READ
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;  -- 读到 1000
-- （此时终端2 提交了 UPDATE 900）
SELECT balance FROM accounts WHERE id = 1;  -- 仍然读到 1000（重复读一致）
COMMIT;
```

---

## Demo 2：FOR UPDATE SKIP LOCKED（任务队列）

```sql
-- 模拟分布式任务处理：多个 worker 竞争 pending 任务

-- Worker 1
BEGIN;
SELECT * FROM jobs WHERE status = 'pending'
ORDER BY created_at LIMIT 1
FOR UPDATE SKIP LOCKED;  -- 跳过其他 worker 已锁定的行

-- 处理任务...
UPDATE jobs SET status = 'processing', worker_id = 1 WHERE id = $1;
COMMIT;

-- Worker 2（同时运行）
BEGIN;
SELECT * FROM jobs WHERE status = 'pending'
ORDER BY created_at LIMIT 1
FOR UPDATE SKIP LOCKED;  -- 自动跳过 Worker 1 锁定的那条
-- 拿到下一条 pending 任务
COMMIT;
```

Node.js 实现（Prisma）：
```ts
async claimJob(workerId: string) {
  return this.prisma.$transaction(async (tx) => {
    // Prisma 不直接支持 SKIP LOCKED，用 $queryRaw
    const jobs = await tx.$queryRaw<Job[]>`
      SELECT * FROM jobs WHERE status = 'pending'
      ORDER BY created_at LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (jobs.length === 0) return null;
    
    return tx.job.update({
      where: { id: jobs[0].id },
      data: { status: 'processing', workerId },
    });
  });
}
```

---

## Demo 3：N+1 检测 + 修复

```ts
// 开启 Prisma 查询日志
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});

// N+1 复现
const posts = await prisma.post.findMany({ take: 10 });
for (const post of posts) {
  const comments = await prisma.comment.count({ where: { postId: post.id } });
  console.log(`${post.title}: ${comments} comments`);
}
// 日志里看到 11 次查询（1 + 10）

// 修复：用 _count
const postsWithCount = await prisma.post.findMany({
  take: 10,
  include: {
    _count: { select: { comments: true } },
  },
});
for (const post of postsWithCount) {
  console.log(`${post.title}: ${post._count.comments} comments`);
}
// 日志里只有 1 次查询
```

---

## Demo 4：Cursor 分页实现

```ts
// cursor-based 分页（适合无限滚动）
async getCursorPosts(cursor?: number, limit = 20) {
  const posts = await this.prisma.post.findMany({
    take: limit + 1,   // 多取1条，判断是否有下一页
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    orderBy: { id: 'desc' },
    select: { id: true, title: true, createdAt: true },
  });

  const hasNextPage = posts.length > limit;
  if (hasNextPage) posts.pop();  // 移除多取的那条
  const nextCursor = hasNextPage ? posts[posts.length - 1]?.id : null;

  return { data: posts, nextCursor, hasNextPage };
}

// 客户端使用
// 第一页：GET /posts/cursor
// 下一页：GET /posts/cursor?cursor=123（上次返回的 nextCursor）
```
