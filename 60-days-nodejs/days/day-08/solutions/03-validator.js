// Day 08 - 练习 2：请求验证
// 实现通用 validate 函数，并集成到 TODO API 中

import http from 'node:http';

// ============ 请求体验证器 ============

/**
 * 验证请求体是否符合规则
 *
 * 支持的规则：
 *   required   {boolean}  — 字段是否必填
 *   type       {string}   — 期望的 typeof 类型（'string' | 'number' | 'boolean'）
 *   minLength  {number}   — 字符串最小长度
 *   maxLength  {number}   — 字符串最大长度
 *   min        {number}   — 数字最小值
 *   max        {number}   — 数字最大值
 *
 * @param {object} body  - 请求体数据
 * @param {object} rules - 验证规则
 * @returns {string[]}   - 错误信息列表，为空时表示验证通过
 */
function validate(body, rules) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = body != null ? body[field] : undefined;

    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} 是必填项`);
      continue; // 必填未通过时跳过后续验证
    }

    // 字段不存在或为 null 时，跳过后续验证
    if (value === undefined || value === null) continue;

    // 类型验证
    if (rule.type !== undefined) {
      const actualType = typeof value;
      if (actualType !== rule.type) {
        errors.push(`${field} 类型错误，期望 ${rule.type}，实际 ${actualType}`);
        continue; // 类型不对时后续约束无意义
      }
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${field} 长度不能小于 ${rule.minLength} 个字符`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${field} 长度不能超过 ${rule.maxLength} 个字符`);
      }
    }

    // 数字范围验证
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} 不能小于 ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} 不能大于 ${rule.max}`);
      }
    }
  }

  return errors;
}

// ============ JSON 请求体解析器 ============

function parseJSON(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      resolve(null);
      return;
    }

    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 1024 * 1024; // 1MB 限制

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        req.destroy();
        reject(new Error('请求体过大'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('无效的 JSON 格式'));
      }
    });

    req.on('error', reject);
  });
}

// ============ 数据存储（内存） ============

let todos = [
  { id: 1, title: '学习 Node.js', completed: false, priority: 1, createdAt: new Date().toISOString() },
  { id: 2, title: '写 REST API', completed: false, priority: 2, createdAt: new Date().toISOString() },
];
let nextId = 3;

// ============ 验证规则 ============

const todoCreateRules = {
  title:     { type: 'string',  required: true,  minLength: 1, maxLength: 200 },
  completed: { type: 'boolean' },
  priority:  { type: 'number',  min: 1, max: 5 },
};

const todoUpdateRules = {
  title:     { type: 'string',  minLength: 1, maxLength: 200 },
  completed: { type: 'boolean' },
  priority:  { type: 'number',  min: 1, max: 5 },
};

// ============ 辅助函数 ============

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  if (data) {
    res.end(JSON.stringify(data, null, 2));
  } else {
    res.end();
  }
}

function parsePathId(pathname) {
  // 匹配 /api/todos/:id 并提取 id
  const match = pathname.match(/^\/api\/todos\/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

// ============ 服务器 ============

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 解析请求体
  try {
    req.body = await parseJSON(req);
  } catch (error) {
    return sendJSON(res, 400, { error: error.message });
  }

  // 路由处理
  try {
    // GET /api/todos
    if (method === 'GET' && pathname === '/api/todos') {
      return sendJSON(res, 200, { data: todos, total: todos.length });
    }

    // GET /api/todos/:id
    if (method === 'GET' && parsePathId(pathname) !== null) {
      const id = parsePathId(pathname);
      const todo = todos.find((t) => t.id === id);
      if (!todo) return sendJSON(res, 404, { error: 'TODO 不存在' });
      return sendJSON(res, 200, { data: todo });
    }

    // POST /api/todos
    if (method === 'POST' && pathname === '/api/todos') {
      const errors = validate(req.body, todoCreateRules);
      if (errors.length > 0) {
        return sendJSON(res, 400, { errors });
      }

      const { title, completed = false, priority = 1 } = req.body;
      const todo = {
        id: nextId++,
        title: title.trim(),
        completed,
        priority,
        createdAt: new Date().toISOString(),
      };
      todos.push(todo);
      return sendJSON(res, 201, { data: todo });
    }

    // PUT /api/todos/:id
    if (method === 'PUT' && parsePathId(pathname) !== null) {
      const id = parsePathId(pathname);
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) return sendJSON(res, 404, { error: 'TODO 不存在' });

      // PUT 时 title 为必填
      const putRules = { ...todoUpdateRules, title: { ...todoUpdateRules.title, required: true } };
      const errors = validate(req.body, putRules);
      if (errors.length > 0) {
        return sendJSON(res, 400, { errors });
      }

      const { title, completed, priority } = req.body;
      if (title !== undefined) todos[index].title = title.trim();
      if (completed !== undefined) todos[index].completed = completed;
      if (priority !== undefined) todos[index].priority = priority;
      todos[index].updatedAt = new Date().toISOString();
      return sendJSON(res, 200, { data: todos[index] });
    }

    // DELETE /api/todos/:id
    if (method === 'DELETE' && parsePathId(pathname) !== null) {
      const id = parsePathId(pathname);
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) return sendJSON(res, 404, { error: 'TODO 不存在' });
      todos.splice(index, 1);
      return sendJSON(res, 204);
    }

    sendJSON(res, 404, { error: `Cannot ${method} ${pathname}` });
  } catch (error) {
    console.error('Handler error:', error);
    sendJSON(res, 500, { error: '服务器内部错误' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 带验证的 TODO API 运行在 http://localhost:${PORT}`);
  console.log('');
  console.log('测试验证（POST 时缺少 title 或类型错误）:');
  console.log(`  curl -X POST http://localhost:${PORT}/api/todos \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d '{"priority": 10}'`);
  console.log('');
  console.log('预期返回:');
  console.log('  { "errors": ["title 是必填项", "priority 不能大于 5"] }');
});
