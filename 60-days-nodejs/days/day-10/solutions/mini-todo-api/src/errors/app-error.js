// Day 10 - 自定义错误类

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 422);
  }
}
