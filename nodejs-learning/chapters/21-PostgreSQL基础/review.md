# Day 21 — PostgreSQL 基础：复习文档

## 核心知识点总结

| 概念 | 要点 |
|------|------|
| 数据类型 | TEXT/VARCHAR 性能相同；TIMESTAMPTZ 存 UTC；JSONB 支持索引 |
| 主键 | SERIAL（自增整数）/ UUID（分布式） |
| 约束 | NOT NULL / UNIQUE / CHECK / FOREIGN KEY |
| 索引 | B-tree 默认；复合索引字段顺序影响可用性；加速读，拖慢写 |
| 事务 | BEGIN/COMMIT/ROLLBACK；ACID 四特性 |
| 分页 | LIMIT n OFFSET (page-1)*n |

## 高频面试题

**Q1：PostgreSQL 和 MySQL 的主要区别？**
PostgreSQL 支持更丰富的类型（JSONB/数组/范围类型）、更强的扩展生态；两者都支持完整 ACID 事务；PostgreSQL 合规更严格，更适合复杂查询和全文搜索；MySQL 在高并发简单查询上有历史优势。

**Q2：什么是 ACID？**
A（原子性）：事务要么全成功全回滚；C（一致性）：事务前后数据满足所有约束；I（隔离性）：并发事务互不干扰；D（持久性）：提交后即使崩溃也不丢失。

**Q3：什么情况下索引会失效？**
- `LIKE '%keyword'`（前缀有通配符）
- 对索引列做函数运算：`WHERE UPPER(name) = 'TOM'`
- 类型不匹配：字符串列用数字比较
- 低选择性字段（如性别），扫全表更快
- `OR` 条件（某些情况无法用复合索引）

**Q4：事务的隔离级别有哪些？**
- READ UNCOMMITTED：读未提交（脏读）
- READ COMMITTED（PostgreSQL 默认）：读已提交，防脏读
- REPEATABLE READ：可重复读，防幻读
- SERIALIZABLE：串行化，最严格

## 自测题（不看答案）

1. 为什么多对多关系需要中间表？
2. `ON DELETE CASCADE` 和 `ON DELETE RESTRICT` 的区别？
3. 如何用 SQL 查询没有任何文章的用户？
4. EXPLAIN ANALYZE 输出里的 `Seq Scan` 和 `Index Scan` 分别表示什么？

## 下一章建议

Day 22：SQL 进阶（JOIN 类型 + 子查询 + 聚合 + 窗口函数）。重点是 `INNER JOIN` / `LEFT JOIN` / `RIGHT JOIN` 的区别，以及 `GROUP BY` + `HAVING` 的用法。这些是面试 SQL 题的核心考点。
