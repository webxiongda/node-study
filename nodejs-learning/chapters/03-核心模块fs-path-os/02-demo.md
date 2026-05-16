# Day 03 — 实操 Demo

## Demo 1：fs/promises 基础操作

### 实操目标
用 `fs/promises` 实现文件的读写、复制、目录操作。

### 代码
```javascript
const fs = require('fs/promises');
const path = require('path');

async function main() {
  const dir = path.join(__dirname, 'temp');
  
  // 1. 创建目录
  await fs.mkdir(dir, { recursive: true });
  console.log('目录已创建:', dir);
  
  // 2. 写文件
  await fs.writeFile(path.join(dir, 'hello.txt'), 'Hello, Node.js!', 'utf8');
  console.log('文件已写入');
  
  // 3. 读文件
  const content = await fs.readFile(path.join(dir, 'hello.txt'), 'utf8');
  console.log('文件内容:', content);
  
  // 4. 追加内容
  await fs.appendFile(path.join(dir, 'hello.txt'), '\nAppended line.');
  
  // 5. 读取目录
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.forEach(e => {
    console.log(`${e.isDirectory() ? '📁' : '📄'} ${e.name}`);
  });
  
  // 6. 获取文件信息
  const stat = await fs.stat(path.join(dir, 'hello.txt'));
  console.log('文件大小:', stat.size, 'bytes');
  console.log('修改时间:', stat.mtime);
  
  // 7. 清理
  await fs.rm(dir, { recursive: true });
  console.log('目录已删除');
}

main().catch(console.error);
```

---

## Demo 2：递归目录遍历

### 实操目标
实现 Unix `tree` 命令的简化版，理解递归 + 异步的组合。

### 代码
```javascript
const fs = require('fs/promises');
const path = require('path');

async function tree(dir, prefix = '', maxDepth = 3, depth = 0) {
  if (depth > maxDepth) return;
  
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return; // 权限不足等情况跳过
  }
  
  // 过滤 node_modules 和隐藏文件
  entries = entries.filter(e => !e.name.startsWith('.') && e.name !== 'node_modules');
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    console.log(prefix + connector + (entry.isDirectory() ? '📁 ' : '') + entry.name);
    
    if (entry.isDirectory()) {
      await tree(path.join(dir, entry.name), childPrefix, maxDepth, depth + 1);
    }
  }
}

const targetDir = process.argv[2] || '.';
console.log(path.resolve(targetDir));
tree(targetDir).catch(console.error);
```

### 运行方式
```bash
node tree.js .          # 当前目录
node tree.js /tmp       # 指定目录
```

---

## Demo 3：path 模块路径拼接对比

### 代码
```javascript
const path = require('path');

console.log('=== path.join ===');
console.log(path.join('a', 'b', 'c'));        // a/b/c
console.log(path.join('/a', 'b', '../c'));     // /a/c（.. 被处理）
console.log(path.join('foo', '/bar', 'baz'));  // foo/bar/baz（/bar 的斜杠被忽略）

console.log('\n=== path.resolve ===');
console.log(path.resolve('a', 'b'));           // /cwd/a/b
console.log(path.resolve('/a', 'b'));          // /a/b
console.log(path.resolve('/a', '/b'));         // /b（遇到绝对路径重置）
console.log(path.resolve('a', '/b', 'c'));     // /b/c

console.log('\n=== 实际工程用法 ===');
// 引用项目内文件：用 __dirname
console.log(path.join(__dirname, 'config', 'app.json'));
// 读用户传入的路径（可能是相对路径）：用 resolve 转绝对
const userInput = '../output';
console.log(path.resolve(userInput)); // 转为绝对路径
```
