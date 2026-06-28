// Day 11 - 验证器（类型守卫）

import type { CreateTodoRequest, UpdateTodoRequest } from './types.js';
import { ValidationError } from './errors.ts';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function validateCreateTodo(body: unknown): CreateTodoRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('请求体必须是 JSON 对象');
  }

  const { title, priority } = body as Record<string, unknown>;

  if (!isString(title) || title.trim().length === 0) {
    throw new ValidationError('title 是必填项且不能为空');
  }

  if (title.length > 200) {
    throw new ValidationError('title 不能超过 200 个字符');
  }

  const result: CreateTodoRequest = { title: title.trim() };

  if (priority !== undefined) {
    if (!isNumber(priority) || priority < 1 || priority > 5) {
      throw new ValidationError('priority 必须是 1-5 之间的数字');
    }
    result.priority = priority;
  }

  return result;
}

export function validateUpdateTodo(body: unknown): UpdateTodoRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('请求体必须是 JSON 对象');
  }

  const { title, completed, priority } = body as Record<string, unknown>;
  const result: UpdateTodoRequest = {};

  if (title !== undefined) {
    if (!isString(title) || title.trim().length === 0) {
      throw new ValidationError('title 不能为空');
    }
    result.title = title.trim();
  }

  if (completed !== undefined) {
    result.completed = Boolean(completed);
  }

  if (priority !== undefined) {
    if (!isNumber(priority) || priority < 1 || priority > 5) {
      throw new ValidationError('priority 必须是 1-5 之间的数字');
    }
    result.priority = priority;
  }

  return result;
}

export function validateBatchIds(body: unknown): number[] {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('请求体必须是 JSON 对象');
  }
  const { ids } = body as Record<string, unknown>;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids 必须是非空数组');
  }
  return ids.map(Number);
}
