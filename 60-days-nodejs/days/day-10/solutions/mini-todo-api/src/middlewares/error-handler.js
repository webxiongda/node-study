// Day 10 - 错误处理中间件

import { AppError } from '../errors/app-error.js';

export function errorHandler() {
  return async (req, res, next) => {
    try {
      await next();
    } catch (error) {
      const isAppError = error instanceof AppError;

      // 非业务错误才打印堆栈，避免日志被已知错误污染
      if (!isAppError) {
        console.error('❌ 未捕获的错误:', error);
      }

      const statusCode = error.statusCode || 500;
      const message = statusCode === 500 ? '服务器内部错误' : error.message;

      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          error: message,
          ...(process.env.NODE_ENV === 'development' && !isAppError && {
            stack: error.stack,
          }),
        })
      );
    }
  };
}
