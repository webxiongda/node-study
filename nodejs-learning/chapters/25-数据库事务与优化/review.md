# Day 25 — 数据库事务与优化：复习文档

## 核心知识点总结

**事务隔离级别**（从低到高）：
READ UNCOMMITTED → READ COMMITTED（PG默认）→ REPEATABLE READ → SERIALIZABLE

**三大异常**：
- 脏读 = 读未提交数据
- 不可重复读 = 同事务两次读同行结果不同
- 幻读 = 同事务两次查行数不同

**优化核心**：
- N+1 → 用 `include` / `_count` 批量加载
- OFFSET 慢 → 大数据量改 Cursor 分页
- 取太多字段 → 用 `select` 只取需要的
- 串行查询 → 用 `$transaction([q1, q2])` 并行

## 高频面试题

**Q1：PostgreSQL 默认隔离级别是什么？会有什么问题？**
READ COMMITTED。问题是同一事务内两次读同一行可能结果不同（不可重复读），对于需要一致快照的长事务，应该升级到 REPEATABLE READ。

**Q2：N+1 问题是什么？在 Prisma 里如何解决？**
查询 N 条记录后对每条单独发查询，共 N+1 次。Prisma 里用 `include` 批量加载关联数据（Prisma 内部用 IN 批量查询），或用 `_count` 聚合替代循环 count。

**Q3：Cursor 分页和 OFFSET 分页各适合什么场景？**
OFFSET 简单，支持跳页，适合小数据量或传统分页 UI；Cursor 性能稳定（O(1) 定位），适合大数据量、无限滚动、Feed 流等场景，但不能跳页。

**Q4：如何防止高并发下的库存超卖？**
用条件更新（WHERE stock >= quantity）保证原子性，或用数据库级别的 CHECK 约束（`stock >= 0`）作为最后防线。不要先 SELECT 再 UPDATE（有时间窗口竞态）。

## 自测题（不看答案）

1. REPEATABLE READ 能防止幻读吗？（PostgreSQL 中）
2. `FOR UPDATE SKIP LOCKED` 适合什么场景？
3. 连接池太小和太大分别有什么问题？
4. 为什么不建议在事务里执行耗时的外部 API 调用？

## 下一章建议

Day 26：接入真实数据库——把博客 API 完整接入 PostgreSQL，包括 seed 数据、迁移管理、环境变量配置、Prisma 在 NestJS 中的生产级配置。这是数据库阶段的里程碑。
