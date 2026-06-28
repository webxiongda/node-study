// Day 10 - 路由器

export class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler) {
    this._register('GET', path, handler);
  }

  post(path, handler) {
    this._register('POST', path, handler);
  }

  put(path, handler) {
    this._register('PUT', path, handler);
  }

  patch(path, handler) {
    this._register('PATCH', path, handler);
  }

  delete(path, handler) {
    this._register('DELETE', path, handler);
  }

  _register(method, path, handler) {
    this.routes.push({ method, path, handler });
  }

  // 匹配路由，返回 { handler, params } 或 null
  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = this._matchPath(route.path, pathname);
      if (params !== null) {
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  // 路径匹配，支持 :param 动态参数
  _matchPath(routePath, requestPath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);

    if (routeParts.length !== requestParts.length) return null;

    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = requestParts[i];
      } else if (routeParts[i] !== requestParts[i]) {
        return null;
      }
    }
    return params;
  }
}
