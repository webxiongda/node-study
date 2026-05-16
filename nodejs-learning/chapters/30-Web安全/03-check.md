# Day 30 — Web 安全：验收自测

## 题 1

XSS 攻击的三种类型分别是什么？各如何防御？

## 题 2

为什么使用 Bearer Token（Authorization header）比纯 Cookie 认证更能防 CSRF？

## 题 3

以下代码有什么安全问题？

```ts
async searchPosts(keyword: string) {
  return this.prisma.$queryRaw(`
    SELECT * FROM posts WHERE title LIKE '%${keyword}%'
  `);
}
```

## 题 4

`SameSite=Strict` 和 `SameSite=Lax` 的区别？各适合什么场景？

## 参考答案

**题 1**：
- 存储型：恶意脚本存数据库，防御：sanitize-html + CSP
- 反射型：恶意脚本在 URL，防御：后端不直接渲染用户输入 + CSP  
- DOM型：前端 JS 直接操作 innerHTML，防御：用 React/Vue 而非直接 DOM 操作

**题 2**：
CSRF 攻击依赖浏览器自动携带 Cookie 的行为。使用 Authorization header 传 Token，攻击者无法通过跨站表单/img 标签自动触发携带 header（JS 需要同源才能设置 header）。因此 Bearer Token 天然免疫 CSRF，无需 CSRF Token。

**题 3**：
SQL 注入漏洞！字符串拼接方式使用 `$queryRaw`，攻击者输入 `%' OR '1'='1' --` 可以绕过 WHERE 条件。

修复：
```ts
return this.prisma.$queryRaw`
  SELECT * FROM posts WHERE title LIKE ${'%' + keyword + '%'}
`;
// 或用 Prisma API（更安全）
return this.prisma.post.findMany({
  where: { title: { contains: keyword, mode: 'insensitive' } },
});
```

**题 4**：
- `Strict`：完全禁止跨站携带 Cookie，包括从外部链接点击进来，安全但体验差（从搜索引擎点进来会显示未登录）
- `Lax`（默认）：允许顶级导航携带 Cookie（点链接/GET 跳转），禁止跨站 POST/iframe 携带，平衡安全和体验
- `None`：完全允许跨站，必须配合 `Secure`（HTTPS），适合需要跨站嵌入的场景（如第三方支付）
