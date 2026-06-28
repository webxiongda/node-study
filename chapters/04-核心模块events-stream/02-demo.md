# Day 04 — 实操 Demo

## Demo 1：自定义 EventEmitter

### 实操目标
继承 EventEmitter 实现一个事件驱动的任务队列，理解 Node.js 事件模型。

### 代码
```javascript
const { EventEmitter } = require('events');

class DownloadManager extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = 3;
  }

  add(url, name) {
    this.queue.push({ url, name });
    this.emit('queued', name);
    this._process();
  }

  async _process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      this.running++;
      this.emit('start', task.name);
      
      // 模拟下载
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      this.running--;
      this.emit('complete', task.name);
      
      if (this.queue.length === 0 && this.running === 0) {
        this.emit('idle');
      }
    }
  }
}

const manager = new DownloadManager();
manager.on('queued',   name => console.log(`📥 排队: ${name}`));
manager.on('start',    name => console.log(`⬇️  开始: ${name}`));
manager.on('complete', name => console.log(`✅ 完成: ${name}`));
manager.on('idle',     ()   => console.log('🎉 全部完成！'));

manager.add('https://example.com/a', 'file-a.zip');
manager.add('https://example.com/b', 'file-b.zip');
manager.add('https://example.com/c', 'file-c.zip');
manager.add('https://example.com/d', 'file-d.zip');
```

---

## Demo 2：Stream pipe 实战

### 实操目标
用 pipe 实现大文件压缩，对比流式和非流式的内存差异。

### 代码
```javascript
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { Transform } = require('stream');

// 1. 生成测试文件（100行重复）
const testFile = path.join(__dirname, 'test.txt');
const gzFile = path.join(__dirname, 'test.txt.gz');

// 写入测试数据
const ws = fs.createWriteStream(testFile);
for (let i = 0; i < 1000; i++) {
  ws.write(`Line ${i}: This is test content for streaming demo.\n`);
}
ws.end();

ws.on('finish', () => {
  console.log('测试文件已创建');
  const start = process.memoryUsage().heapUsed;
  
  // 2. 流式压缩：读 → 压缩 → 写
  fs.createReadStream(testFile)
    .pipe(zlib.createGzip())
    .pipe(fs.createWriteStream(gzFile))
    .on('finish', () => {
      const end = process.memoryUsage().heapUsed;
      const orig = fs.statSync(testFile).size;
      const comp = fs.statSync(gzFile).size;
      console.log(`原始大小: ${orig} bytes`);
      console.log(`压缩后: ${comp} bytes (${((1 - comp/orig)*100).toFixed(1)}% 减小)`);
      console.log(`内存增量: ${((end - start) / 1024).toFixed(1)} KB`); // 流式：几乎不增加
      
      // 清理
      fs.unlinkSync(testFile);
      fs.unlinkSync(gzFile);
    });
});
```

---

## Demo 3：自定义 Transform 流

### 实操目标
实现一个 CSV → JSON 的 Transform 流，理解如何构建流处理管道。

### 代码
```javascript
const { Transform } = require('stream');

class CSVToJSONTransform extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this.headers = null;
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // 最后一行可能不完整，暂存

    for (const line of lines) {
      if (!line.trim()) continue;
      const values = line.split(',').map(v => v.trim());
      
      if (!this.headers) {
        this.headers = values;
      } else {
        const obj = {};
        this.headers.forEach((h, i) => { obj[h] = values[i]; });
        this.push(JSON.stringify(obj) + '\n');
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim() && this.headers) {
      const values = this.buffer.split(',').map(v => v.trim());
      const obj = {};
      this.headers.forEach((h, i) => { obj[h] = values[i]; });
      this.push(JSON.stringify(obj) + '\n');
    }
    callback();
  }
}

// 使用
const { Readable } = require('stream');
const csvData = `name,age,city
Alice,28,Beijing
Bob,32,Shanghai
Charlie,25,Guangzhou`;

Readable.from(csvData)
  .pipe(new CSVToJSONTransform())
  .pipe(process.stdout);
```
