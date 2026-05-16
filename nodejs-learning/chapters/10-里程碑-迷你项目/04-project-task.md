# Day 10 — 项目任务：整理并提交迷你 TODO API

## 任务说明

这不是一个新功能任务，而是整合任务：把 Day 08-09 的代码重构成**可提交到 GitHub 的完整项目**。

## 具体步骤

### Step 1：创建项目目录
```bash
mkdir mini-todo-api && cd mini-todo-api
npm init -y
```

### Step 2：完成项目结构
```
mini-todo-api/
├── package.json
├── README.md
├── src/
│   ├── index.js        — 启动入口
│   ├── app.js          — 中间件 + 路由注册
│   ├── router.js       — Router 类
│   ├── errors.js       — 自定义错误类
│   ├── middleware/
│   │   ├── logger.js
│   │   ├── cors.js
│   │   ├── bodyParser.js
│   │   └── errorHandler.js
│   └── routes/
│       └── todos.js
```

### Step 3：代码质量
- 所有文件不超过 80 行（超过则分拆）
- 消除魔法数字，提取为常量
- 统一用 `module.exports` 或全部用 ESM

### Step 4：README.md
必须包含：快速启动命令、完整 API 表格、至少一个 curl 示例。

### Step 5：测试脚本
```bash
# test.sh
curl -s http://localhost:3000/todos | python3 -m json.tool
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"title":"Learn Node.js"}' http://localhost:3000/todos | python3 -m json.tool
# ... 覆盖所有接口
```

## 验收标准

- [ ] `node src/index.js` 无报错启动
- [ ] 运行测试脚本全部通过
- [ ] README 清晰，有人能按 README 启动
- [ ] git commit 历史清晰（至少3个commit：初始化、核心功能、文档）
