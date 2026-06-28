// Day 10 - 响应工具函数

/**
 * 发送 JSON 响应
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {*} data
 */
export function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  if (data !== undefined) {
    res.end(JSON.stringify(data));
  } else {
    res.end();
  }
}
