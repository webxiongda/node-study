// Day 10 - 中间件引擎

export class MiddlewareEngine {
  constructor() {
    this.middlewares = [];
  }

  // 注册中间件
  use(fn) {
    this.middlewares.push(fn);
  }

  // 依次执行所有中间件
  async execute(req, res) {
    let index = 0;

    const next = async () => {
      if (index >= this.middlewares.length) return;
      const middleware = this.middlewares[index++];
      await middleware(req, res, next);
    };

    await next();
  }
}
