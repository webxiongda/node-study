/**
 * node-study 静态站点生成器
 *
 * 把仓库里的 markdown 教程编译成纯静态站点（无后端、无登录）。
 * 输入：chapters/<NN-章节名>/*.md + README.md 的章节总表
 * 输出：dist/index.html、dist/chapter/<NN>/<file>.html
 *
 * 运行：node build-site.mjs
 */
import { marked } from 'marked';
import hljs from 'highlight.js';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync, cpSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const CHAPTERS = join(ROOT, 'chapters');

// ---------- markdown 渲染 ----------
marked.setOptions({ gfm: true, breaks: false });

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  const language = (lang || '').match(/^\S*/)?.[0] || '';
  let body;
  if (language && hljs.getLanguage(language)) {
    try {
      body = hljs.highlight(text, { language }).value;
    } catch {
      body = escapeHtml(text);
    }
  } else {
    body = escapeHtml(text);
  }
  return `<pre class="code"><code class="hljs">${body}</code></pre>`;
};
marked.use({ renderer });

// ---------- 读取 README 章节总表 ----------
function parseReadmeTable() {
  const readmePath = join(ROOT, 'README.md');
  if (!existsSync(readmePath)) return new Map();
  const lines = readFileSync(readmePath, 'utf8').split('\n');
  const map = new Map();
  for (const line of lines) {
    const m = line.match(/^\|\s*(\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!m) continue;
    map.set(m[1], {
      no: m[1],
      title: m[2],
      summary: m[3],
      priority: m[4],
      hours: m[5],
      status: m[6],
    });
  }
  return map;
}

// ---------- 收集章节 ----------
const meta = parseReadmeTable();
const dirEntries = readdirSync(CHAPTERS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const chapters = [];
for (const dirName of dirEntries) {
  const no = dirName.slice(0, 2);
  const files = readdirSync(join(CHAPTERS, dirName))
    .filter((f) => f.endsWith('.md'))
    .sort();
  const info = meta.get(no) || {};
  chapters.push({
    no,
    dirName,
    title: info.title || dirName.slice(3),
    summary: info.summary || '',
    priority: info.priority || '',
    hours: info.hours || '',
    status: info.status || '',
    files,
  });
}

console.log(`✅ 解析到 ${chapters.length} 个章节，${chapters.reduce((a, c) => a + c.files.length, 0)} 个 markdown 文件`);

// ---------- 样式 ----------
const CSS = `
:root{--bg:#0f1115;--panel:#171a21;--border:#252a34;--text:#e6e9ef;--muted:#98a2b3;--accent:#6ea8fe;--accent2:#7ee787;--code-bg:#0b0d12;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;line-height:1.75}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.layout{display:flex;min-height:100vh}
.sidebar{width:290px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);overflow-y:auto;height:100vh;position:sticky;top:0}
.sidebar h2{font-size:15px;padding:18px 16px 10px;margin:0;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.sidebar a.item{display:block;padding:9px 16px;font-size:13.5px;color:var(--text);border-left:3px solid transparent}
.sidebar a.item:hover{background:#1e222b;text-decoration:none;border-left-color:var(--accent)}
.sidebar a.item.active{background:#1e222b;border-left-color:var(--accent);color:var(--accent)}
.sidebar .no{color:var(--muted);margin-right:7px;font-variant-numeric:tabular-nums}
.main{flex:1;min-width:0;padding:36px 44px 90px;max-width:1100px}
h1{font-size:30px;margin:0 0 6px;line-height:1.3}
h2{font-size:22px;margin:34px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border)}
h3{font-size:17px;margin:26px 0 10px}
h4{font-size:15px;margin:20px 0 8px;color:var(--muted)}
p{margin:12px 0}
ul,ol{padding-left:24px}
li{margin:5px 0}
code{background:var(--code-bg);padding:2px 6px;border-radius:4px;font-size:13px;font-family:"SF Mono",Menlo,Consolas,monospace;border:1px solid var(--border)}
pre.code{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:15px 17px;overflow-x:auto;margin:16px 0}
pre.code code{background:none;border:none;padding:0;font-size:12.8px;line-height:1.65}
table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}
th,td{border:1px solid var(--border);padding:9px 12px;text-align:left}
th{background:var(--panel)}
tr:nth-child(even) td{background:#141821}
blockquote{margin:16px 0;padding:10px 18px;border-left:3px solid var(--accent);background:var(--panel);color:var(--muted)}
hr{border:none;border-top:1px solid var(--border);margin:30px 0}
.hljs-keyword,.hljs-selector-tag,.hljs-literal{color:#ff7b72}
.hljs-string,.hljs-attr,.hljs-addition{color:#a5d6ff}
.hljs-number,.hljs-symbol{color:#79c0ff}
.hljs-comment,.hljs-quote{color:#6e7681;font-style:italic}
.hljs-title,.hljs-function{color:#d2a8ff}
.hljs-built_in,.hljs-type{color:#ffa657}
.meta{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0 26px;font-size:12.5px;color:var(--muted)}
.badge{background:var(--panel);border:1px solid var(--border);padding:3px 10px;border-radius:99px}
.back{display:inline-block;margin-bottom:18px;font-size:14px}
.card{display:block;padding:16px 18px;margin:12px 0;background:var(--panel);border:1px solid var(--border);border-radius:10px;color:var(--text)}
.card:hover{border-color:var(--accent);text-decoration:none}
.card .t{font-weight:600;margin-bottom:4px}
.card .s{font-size:13px;color:var(--muted)}
.tabs{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0 26px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.tabs a{font-size:13.5px;padding:6px 13px;background:var(--panel);border:1px solid var(--border);border-radius:7px;color:var(--text)}
.tabs a.active{background:var(--accent);color:#0b0d12;border-color:var(--accent);font-weight:600}
.lead{color:var(--muted);font-size:15px}
@media(max-width:860px){.sidebar{display:none}.main{padding:24px 18px 70px}}
`;

// ---------- 页面模板 ----------
function sidebar(current) {
  const items = chapters
    .map(
      (c) =>
        `<a class="item${current === c.no ? ' active' : ''}" href="/chapter/${c.no}/index.html"><span class="no">${c.no}</span>${escapeHtml(c.title)}</a>`
    )
    .join('\n');
  return `<aside class="sidebar"><h2>章节目录</h2><a class="item${!current ? ' active' : ''}" href="/index.html">🏠 首页</a>\n${items}</aside>`;
}

function page({ title, current, body }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Node.js 学习路线</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<div class="layout">
${sidebar(current)}
<main class="main">
${body}
</main>
</div>
</body>
</html>`;
}

// ---------- 构建 ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });
mkdirSync(join(DIST, 'chapter'), { recursive: true });
writeFileSync(join(DIST, 'assets', 'style.css'), CSS.trim());

// 首页
const cards = chapters
  .map(
    (c) => `<a class="card" href="/chapter/${c.no}/index.html">
      <div class="t">${c.no} · ${escapeHtml(c.title)}</div>
      <div class="s">${escapeHtml(c.summary)} · ${escapeHtml(c.priority)} · ${escapeHtml(c.hours)}</div>
    </a>`
  )
  .join('\n');

writeFileSync(
  join(DIST, 'index.html'),
  page({
    title: '首页',
    current: null,
    body: `<h1>Node.js 全栈学习路线</h1>
<p class="lead">面试向 · 共 ${chapters.length} 章 · 每天 2 小时 · 纯静态站点，无需登录</p>
<div class="meta"><span class="badge">${chapters.length} 章节</span><span class="badge">${chapters.reduce((a, c) => a + c.files.length, 0)} 篇文档</span><span class="badge">无需登录</span></div>
${cards}`,
  })
);

// 每章
let pageCount = 1;
for (const chapter of chapters) {
  const outDir = join(DIST, 'chapter', chapter.no);
  mkdirSync(outDir, { recursive: true });

  const rendered = chapter.files.map((file) => ({
    file,
    slug: file.replace(/\.md$/, ''),
    html: marked.parse(readFileSync(join(CHAPTERS, chapter.dirName, file), 'utf8')),
  }));

  const tabs = rendered
    .map(
      (r, i) =>
        `<a href="/chapter/${chapter.no}/${r.slug}.html"${i === 0 ? ' class="active"' : ''}>${escapeHtml(
          basename(r.file, '.md')
        )}</a>`
    )
    .join('\n');

  rendered.forEach((r, i) => {
    const body = `<a class="back" href="/index.html">← 返回目录</a>
<h1>${chapter.no} · ${escapeHtml(chapter.title)}</h1>
<p class="lead">${escapeHtml(r.file.replace(/\.md$/, ''))}</p>
<div class="meta">
  <span class="badge">${escapeHtml(chapter.priority)}</span>
  <span class="badge">${escapeHtml(chapter.hours)}</span>
  ${chapter.status ? `<span class="badge">${escapeHtml(chapter.status)}</span>` : ''}
</div>
<div class="tabs">${tabs}</div>
${r.html}
${i < rendered.length - 1 ? `<a class="back" href="/chapter/${chapter.no}/${rendered[i + 1].slug}.html">下一篇：${escapeHtml(rendered[i + 1].file.replace(/\.md$/, ''))} →</a>` : ''}`;
    const outName = i === 0 ? 'index.html' : `${r.slug}.html`;
    writeFileSync(join(outDir, outName), page({ title: `${chapter.no} ${chapter.title}`, current: chapter.no, body }));
    pageCount++;
  });
}

// 附带拷贝原始 markdown + 60-days 资源，方便直接看源码
const rawDir = join(DIST, 'raw');
mkdirSync(rawDir, { recursive: true });
cpSync(CHAPTERS, join(rawDir, 'chapters'), { recursive: true });
if (existsSync(join(ROOT, '60-days-nodejs'))) cpSync(join(ROOT, '60-days-nodejs'), join(rawDir, '60-days-nodejs'), { recursive: true });

console.log(`✅ 生成 ${pageCount} 个 HTML 页面 + 原始 markdown 副本`);
console.log(`📁 输出目录：${DIST}`);