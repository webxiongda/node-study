// Day 10 - CORS 中间件

export function cors(options = {}) {
  const {
    origin = '*',
    methods = 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    headers = 'Content-Type, Authorization',
    credentials = false,
    maxAge = 86400,
  } = options;

  return async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Max-Age', String(maxAge));

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // 预检请求直接返回 204
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    await next();
  };
}
