# Day 01 — 实操 Demo

## Demo 1：process 对象全景探索

### 实操目标
理解 `process` 对象的各个属性，建立"Node.js 进程信息"的直觉。

### 操作步骤
在 `60-days-nodejs/days/day-01/` 目录下新建 `process-explore.js`，运行并观察输出。

### 示例代码
```javascript
// 运行: node process-explore.js --env=dev --port=3000

// 版本信息
console.log('=== Node.js 版本信息 ===');
console.log('Node 版本:', process.version);
console.log('V8 版本:', process.versions.v8);
console.log('平台:', process.platform);
console.log('架构:', process.arch);

// 进程信息
console.log('\n=== 进程信息 ===');
console.log('进程 PID:', process.pid);
console.log('工作目录:', process.cwd());
console.log('脚本目录:', __dirname);

// 命令行参数解析
console.log('\n=== 命令行参数 ===');
const args = process.argv.slice(2);
const params = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    params[key] = value ?? true;
  }
});
console.log('原始 argv:', process.argv);
console.log('解析后的参数:', params);

// 环境变量
console.log('\n=== 环境变量 ===');
console.log('HOME:', process.env.HOME);
console.log('NODE_ENV:', process.env.NODE_ENV ?? '未设置');

// 内存
const mem = process.memoryUsage();
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
console.log('\n=== 内存使用 ===');
console.log('RSS:', mb(mem.rss));
console.log('堆总量:', mb(mem.heapTotal));
console.log('堆已用:', mb(mem.heapUsed));
```

### 运行方式
```bash
node process-explore.js --env=dev --port=3000
# 或者加上环境变量
NODE_ENV=production node process-explore.js
```

### 关注点
- 观察 `argv[0]` 和 `argv[1]` 是什么
- 观察 `cwd()` 和 `__dirname` 是否相同（取决于你从哪个目录运行）

---

## Demo 2：命令行参数驱动的脚本

> 💡 说明：这是实际工程中常见的模式。很多 CLI 工具（如 `node script.js --watch --port=8080`）都是这样解析参数的。

### 实操目标
练习 `process.argv` 解析，为后续写 CLI 工具打基础。

### 示例代码（即 day-01 练习 2 的核心模式）
```javascript
// calc.js
const [,, operation, a, b] = process.argv;

if (!operation || a === undefined || b === undefined) {
  console.error('用法: node calc.js <add|subtract|multiply|divide> <num1> <num2>');
  process.exit(1);  // 退出码 1 表示错误
}

const num1 = Number(a);
const num2 = Number(b);

if (isNaN(num1) || isNaN(num2)) {
  console.error('错误: 参数必须是数字');
  process.exit(1);
}

const ops = {
  add: (x, y) => x + y,
  subtract: (x, y) => x - y,
  multiply: (x, y) => x * y,
  divide: (x, y) => {
    if (y === 0) { console.error('错误: 除数不能为零'); process.exit(1); }
    return x / y;
  }
};

if (!ops[operation]) {
  console.error(`错误: 不支持的操作 "${operation}"`);
  process.exit(1);
}

console.log(ops[operation](num1, num2));
process.exit(0);  // 退出码 0 表示成功
```

### 运行方式
```bash
node calc.js add 10 3       # 13
node calc.js divide 10 0    # 错误: 除数不能为零
node calc.js mod 10 3       # 错误: 不支持的操作 "mod"
```

---

## Demo 3：process.stdin 交互式输入

### 实操目标
理解 Node.js 如何读取用户输入（这是 Stream 的最初接触）。

### 示例代码
```javascript
// greeter.js（使用 readline 模块简化 stdin 操作）
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 封装成 Promise，方便后续用 async/await
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  const name = await ask('你的名字: ');
  const age = await ask('你的年龄: ');
  
  console.log(`\n你好, ${name}! 你今年 ${age} 岁。`);
  
  rl.close();
}

main();
```

### 关注点
- `readline.createInterface` 包装了 `process.stdin`，提供更友好的 API
- 这里提前接触了 **Promise + async/await** 模式，Day 06 会深入讲
- `rl.close()` 是必须的，否则程序不会退出（因为 stdin 还在监听）
