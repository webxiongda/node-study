// Day 10 - 请求日志中间件

export function logger() {
  return async (req, res, next) => {
    const start = Date.now();
    const { method, url } = req;

    // 劫持 res.end 来捕获最终状态码
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const statusColor =
        status >= 500 ? '\x1b[31m' : // 红色
        status >= 400 ? '\x1b[33m' : // 黄色
        status >= 300 ? '\x1b[36m' : // 青色
        '\x1b[32m';                   // 绿色

      const timestamp = new Date().toISOString();
      process.stdout.write(
        `[${timestamp}] ${statusColor}${status}\x1b[0m ${method} ${url} — ${duration}ms\n`
      );
      originalEnd.apply(this, args);
    };

    await next();
  };
}
