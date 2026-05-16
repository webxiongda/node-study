// Day 11 - 类型定义

import type http from 'node:http';

// 请求类型
export interface CreateTodoRequest {
  title: string;
  priority?: number;
}

export interface UpdateTodoRequest {
  title?: string;
  completed?: boolean;
  priority?: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  completed?: string;
  search?: string;
}

// 数据模型
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: number;
  createdAt: string;
  updatedAt?: string;
}

// 响应类型
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: string;
  details?: Record<string, string>;
}

// HTTP 相关
export interface EnhancedRequest extends http.IncomingMessage {
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

export interface EnhancedResponse extends http.ServerResponse {
  json: (statusCode: number, data: unknown) => void;
}

export type RouteHandler = (
  req: EnhancedRequest,
  res: EnhancedResponse
) => void | Promise<void>;

// 中间件类型
export type Middleware = (
  req: EnhancedRequest,
  res: EnhancedResponse,
  next: () => Promise<void>
) => void | Promise<void>;
