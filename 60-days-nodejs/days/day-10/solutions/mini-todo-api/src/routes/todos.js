// Day 10 - TODO 路由定义
// 包含完整 CRUD + 分页 + 过滤 + 排序 + 搜索 + 批量删除

import { NotFoundError, ValidationError } from '../errors/app-error.js';
import { sendJSON } from '../utils/response.js';

// 内存数据存储（生产环境应替换为数据库）
let todos = [];
let nextId = 1;

export function registerTodoRoutes(router) {
  // ─────────────────────────────────────────────────────────
  // GET /api/todos
  // 查询参数：page, limit, completed, sort, order, search
  // ─────────────────────────────────────────────────────────
  router.get('/api/todos', (req, res) => {
    const {
      page = '1',
      limit = '10',
      completed,
      sort,
      order = 'asc',
      search,
    } = req.query;

    let result = [...todos];

    // 按完成状态过滤
    if (completed !== undefined) {
      result = result.filter((t) => t.completed === (completed === 'true'));
    }

    // 模糊搜索 title
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(keyword));
    }

    // 排序
    if (sort === 'priority') {
      result.sort((a, b) =>
        order === 'desc' ? b.priority - a.priority : a.priority - b.priority
      );
    } else if (sort === 'createdAt') {
      result.sort((a, b) => {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return order === 'desc' ? -diff : diff;
      });
    }

    // 分页（最多每页 100 条）
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const start = (p - 1) * l;
    const paged = result.slice(start, start + l);

    sendJSON(res, 200, {
      data: paged,
      pagination: {
        page: p,
        limit: l,
        total: result.length,
        totalPages: Math.ceil(result.length / l),
      },
    });
  });

  // ─────────────────────────────────────────────────────────
  // GET /api/todos/:id
  // ─────────────────────────────────────────────────────────
  router.get('/api/todos/:id', (req, res) => {
    const todo = todos.find((t) => t.id === parseInt(req.params.id));
    if (!todo) throw new NotFoundError('TODO');
    sendJSON(res, 200, { data: todo });
  });

  // ─────────────────────────────────────────────────────────
  // POST /api/todos
  // Body: { title: string, priority?: 1-5 }
  // ─────────────────────────────────────────────────────────
  router.post('/api/todos', (req, res) => {
    const { title, priority = 3 } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('title 不能为空');
    }
    if (title.trim().length > 200) {
      throw new ValidationError('title 不能超过 200 个字符');
    }

    const todo = {
      id: nextId++,
      title: title.trim(),
      completed: false,
      priority: Math.min(5, Math.max(1, parseInt(priority) || 3)),
      createdAt: new Date().toISOString(),
    };
    todos.push(todo);
    sendJSON(res, 201, { data: todo });
  });

  // ─────────────────────────────────────────────────────────
  // PUT /api/todos/:id  —  全量更新
  // Body: { title?, completed?, priority? }
  // ─────────────────────────────────────────────────────────
  router.put('/api/todos/:id', (req, res) => {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) throw new NotFoundError('TODO');

    const { title, completed, priority } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        throw new ValidationError('title 不能为空');
      }
      if (title.trim().length > 200) {
        throw new ValidationError('title 不能超过 200 个字符');
      }
      todos[index].title = title.trim();
    }

    if (completed !== undefined) {
      todos[index].completed = Boolean(completed);
    }

    if (priority !== undefined) {
      todos[index].priority = Math.min(5, Math.max(1, parseInt(priority) || todos[index].priority));
    }

    todos[index].updatedAt = new Date().toISOString();
    sendJSON(res, 200, { data: todos[index] });
  });

  // ─────────────────────────────────────────────────────────
  // PATCH /api/todos/:id  —  部分更新
  // Body: { title?, completed?, priority? }
  // ─────────────────────────────────────────────────────────
  router.patch('/api/todos/:id', (req, res) => {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) throw new NotFoundError('TODO');

    const { title, completed, priority } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        throw new ValidationError('title 不能为空');
      }
      todos[index].title = title.trim();
    }

    if (completed !== undefined) {
      todos[index].completed = Boolean(completed);
    }

    if (priority !== undefined) {
      todos[index].priority = Math.min(5, Math.max(1, parseInt(priority) || todos[index].priority));
    }

    todos[index].updatedAt = new Date().toISOString();
    sendJSON(res, 200, { data: todos[index] });
  });

  // ─────────────────────────────────────────────────────────
  // DELETE /api/todos/:id  —  删除单个 TODO
  // ─────────────────────────────────────────────────────────
  router.delete('/api/todos/:id', (req, res) => {
    const index = todos.findIndex((t) => t.id === parseInt(req.params.id));
    if (index === -1) throw new NotFoundError('TODO');
    todos.splice(index, 1);
    sendJSON(res, 204);
  });

  // ─────────────────────────────────────────────────────────
  // DELETE /api/todos  —  批量删除
  // Body: { ids: number[] }
  // ─────────────────────────────────────────────────────────
  router.delete('/api/todos', (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('ids 必须是一个非空数组');
    }

    const idSet = new Set(ids.map(Number));
    const before = todos.length;
    todos = todos.filter((t) => !idSet.has(t.id));
    const deleted = before - todos.length;

    sendJSON(res, 200, { deleted });
  });
}
