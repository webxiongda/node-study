#!/bin/bash
# node-study 静态站点部署脚本（在 ECS 上执行）
#
# node-study 本就无后端无登录，这里只做：拉源码 → 构建静态站 → 确保 vhost 存在 → reload nginx
set -eo pipefail

SITE_DIR='/www/wwwroot/node-study'
VHOST='/www/server/panel/vhost/nginx/node-study.conf'
PORT=8087

echo "=== 1. 下载源码 ==="
TAR=/tmp/_node-study.tar.gz
rm -f "$TAR"
http=$(curl -sSL -o "$TAR" -w '%{http_code}' --max-time 180 \
  "https://codeload.github.com/webxiongda/node-study/tar.gz/refs/heads/main")
[ "$http" = "200" ] || { echo "❌ 下载失败 HTTP=$http"; exit 1; }
tar -tzf "$TAR" >/dev/null && echo "tar OK ($(du -h $TAR | cut -f1))"

echo "=== 2. 替换源码（dist 会重建，node_modules 可留）==="
cd "$SITE_DIR" 2>/dev/null || { mkdir -p "$SITE_DIR"; cd "$SITE_DIR"; }
KEEP=/tmp/_node_keep
rm -rf "$KEEP"; mkdir -p "$KEEP"
[ -d node_modules ] && mv node_modules "$KEEP/" || true
rm -rf chapters nodejs-learning 60-days-nodejs dist
tar -xzf "$TAR" --strip-components=1
rm -f "$TAR"
[ -d "$KEEP/node_modules" ] && mv "$KEEP/node_modules" ./ || true
rm -rf "$KEEP"

echo "=== 3. 安装构建依赖并生成站点 ==="
export PATH=/usr/local/bin:$PATH
npm install marked@^14 highlight.js@^11 --no-audit --no-fund 2>&1 | tail -2
node build-site.mjs 2>&1 | tail -4
echo "HTML 页面数: $(find dist -name '*.html' | wc -l)  dist 大小: $(du -sh dist | cut -f1)"

echo "=== 4. 确保 nginx vhost 存在 ===="
if ! grep -q "listen ${PORT};" "$VHOST" 2>/dev/null; then
  echo "创建 vhost -> ${VHOST}"
  cat > "$VHOST" << NGINX_EOF
server {
    listen ${PORT};
    server_name _;

    root ${SITE_DIR}/dist;
    index index.html;

    access_log  /www/wwwlogs/node-study.access.log;
    error_log   /www/wwwlogs/node-study.error.log;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /raw/ {
        default_type text/plain;
        charset utf-8;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)\$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files \$uri =404;
    }
}
NGINX_EOF
else
  echo "vhost 已存在，跳过创建"
fi

echo "=== 5. 防火墙放行 ${PORT}（仅首次需要，幂等）==="
if ! firewall-cmd --list-ports 2>/dev/null | tr ' ' '\n' | grep -qx "${PORT}/tcp"; then
  firewall-cmd --add-port=${PORT}/tcp --permanent >/dev/null 2>&1 && firewall-cmd --reload >/dev/null 2>&1 && echo "已放行 ${PORT}"
else
  echo "${PORT} 已放行"
fi

echo "=== 6. 校验并重载 nginx ==="
nginx -t && nginx -s reload && echo "NGINX RELOAD OK"

echo "=== 7. 本机自测 ==="
sleep 2
for p in "/" "/chapter/01/index.html" "/assets/style.css"; do
  printf "  %-28s %s\n" "$p" "$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}$p")"
done
echo "=== NODE-STUDY DEPLOY DONE ==="