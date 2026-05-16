# Day 22 — SQL 进阶：复习文档

## 核心知识点总结

| 类型 | 特点 |
|------|------|
| INNER JOIN | 只返回两表匹配的行 |
| LEFT JOIN | 返回左表所有行 + 右表匹配（NULL填充） |
| GROUP BY + HAVING | 分组后聚合，HAVING 过滤组 |
| 窗口函数 | PARTITION BY 分组，OVER 不折叠行 |
| EXISTS | 找到第一个匹配就停止，大结果集比 IN 快 |

**最左前缀原则**：复合索引 `(a,b,c)` 必须从 `a` 开始才能用。

## 高频面试题

**Q1：INNER JOIN 和 LEFT JOIN 的区别？**（必须会答）
INNER JOIN 只返回两表都有匹配的行；LEFT JOIN 保留左表所有行，右表无匹配用 NULL 填充。

**Q2：WHERE 和 HAVING 的区别？**
WHERE 在分组前过滤（不能用聚合函数）；HAVING 在分组后过滤（可以用聚合函数）。

**Q3：为什么对索引列做函数运算会导致索引失效？**
数据库对索引列存储的是原始值，函数结果不在索引里，无法用 B-tree 索引定位。解决方案：函数索引 `CREATE INDEX ... ON table(LOWER(col))`。

**Q4：窗口函数和 GROUP BY 的区别？**
GROUP BY 折叠行（多行变一行）；窗口函数不折叠，每行都保留，但多了一个"组内计算"的列（如排名、累计和）。

## 自测题（不看答案）

1. 查询没有任何评论的文章，用 NOT EXISTS 写
2. `COUNT(*)` 统计某列为 NULL 的行吗？
3. 如何查询同一天注册的用户数量？
4. 子查询和 JOIN 性能上有什么差异？

## 下一章建议

Day 23：Prisma ORM 入门——schema 定义、`prisma migrate`、CRUD 操作、Prisma Client。重点是 Prisma 的类型安全 API 和 schema 驱动开发。
