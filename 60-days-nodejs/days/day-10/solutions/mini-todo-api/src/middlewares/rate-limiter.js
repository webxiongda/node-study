// Day 10 - 请求限流中间件（Rate Limiter）
// 同一 IP 在 windowMs 毫秒内最多请求 max 次

export function rateLimiter(options = {}) {
  const { windowMs = 60000, max = 60 } = options;

  // IP -> { count, resetTime }
  const store = new Map();

  // 定期清理过期记录，避免内存泄漏
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now >= record.resetTime) {
        store.delete(ip);
      }
    }
  }, windowMs);

  // 不阻止进程退出
  timer.unref();

  return async (req, res, next) => {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    let record = store.get(ip);

    if (!record || now >= record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      store.set(ip, record);
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (record.count > max) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          error: '请求过于频繁，请稍后再试',
          retryAfter: resetSeconds,
        })
      );
      return;
    }

    await next();
  };
}
