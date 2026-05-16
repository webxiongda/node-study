# Day 11 — 实操 Demo

## Demo 1：TypeScript 版 TODO API（核心片段）

```typescript
// src/types/todo.ts
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export type CreateTodoDto = Pick<Todo, 'title'>;
export type UpdateTodoDto = Partial<Pick<Todo, 'title' | 'completed'>>;

// src/store.ts
let todos: Todo[] = [];
let nextId = 1;

export const todoStore = {
  findAll(): Todo[] { return todos; },
  findById(id: number): Todo | undefined { return todos.find(t => t.id === id); },
  create(dto: CreateTodoDto): Todo {
    const todo: Todo = { id: nextId++, title: dto.title, completed: false, createdAt: new Date().toISOString() };
    todos.push(todo);
    return todo;
  },
  update(id: number, dto: UpdateTodoDto): Todo | null {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return null;
    todos[idx] = { ...todos[idx], ...dto };
    return todos[idx];
  },
  delete(id: number): boolean {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return false;
    todos.splice(idx, 1);
    return true;
  },
};

// src/validation.ts
import { CreateTodoDto } from './types/todo';

export function validateCreateTodo(body: unknown): CreateTodoDto {
  if (typeof body !== 'object' || body === null) {
    throw Object.assign(new Error('Request body must be an object'), { status: 400 });
  }
  const { title } = body as Record<string, unknown>;
  if (typeof title !== 'string' || !title.trim()) {
    throw Object.assign(new Error('title is required'), { status: 400 });
  }
  return { title: title.trim() };
}
```

---

## Demo 2：泛型工具函数

```typescript
// 分页工具（泛型）
interface PaginationOptions {
  page: number;
  limit: number;
}

function paginate<T>(items: T[], { page, limit }: PaginationOptions) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  };
}

// 使用（类型推导自动完成）
const result = paginate(todos, { page: 1, limit: 10 });
// result.data 的类型是 Todo[]（自动推导）

// 过滤工具
function filterBy<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

const activeTodos = filterBy(todos, t => !t.completed);
// activeTodos 类型是 Todo[]
```
