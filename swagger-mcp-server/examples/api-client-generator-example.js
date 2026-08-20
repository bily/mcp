/**
 * API客户端生成器MCP工具使用示例
 * 
 * 这个文件展示了如何使用MCP的API客户端生成工具来生成不同类型的API客户端代码。
 * 
 * 使用方法:
 * 1. 确保MCP服务器已经启动: `node start-server.js`
 * 2. 运行示例: `node examples/api-client-generator-example.js [example]`
 *    其中[example]可以是:
 *      - standard: 使用标准生成器
 *      - optimized: 使用优化生成器
 *      - react-query: 生成React Query客户端
 */

const net = require('net');
const path = require('path');
const fs = require('fs');

// 连接到MCP服务器的函数
function connectToMcpServer() {
  const process = require('child_process').spawn('node', ['start-server.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  return {
    send: (message) => {
      process.stdin.write(JSON.stringify(message) + '\n');
    },
    onMessage: (callback) => {
      let buffer = '';
      process.stdout.on('data', (data) => {
        buffer += data.toString();
        
        try {
          // 尝试解析完整的JSON消息
          const messages = buffer.split('\n').filter(Boolean);
          for (const msg of messages) {
            const parsed = JSON.parse(msg);
            callback(parsed);
          }
          buffer = '';
        } catch (e) {
          // 消息不完整，继续等待更多数据
        }
      });
    },
    close: () => {
      process.kill();
    }
  };
}

// 创建临时输出目录
const outputDir = path.join(process.cwd(), 'examples', 'generated-clients');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 不同示例配置
const examples = {
  // 标准生成器示例
  standard: {
    method: 'generate-api-client',
    params: {
      swaggerUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
      outputDir: outputDir,
      clientType: 'axios',
      overwrite: true,
      groupBy: 'tag'
    }
  },
  
  // 优化生成器示例
  optimized: {
    method: 'generate-api-client-optimized',
    params: {
      swaggerUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
      outputDir: path.join(outputDir, 'optimized'),
      clientType: 'axios',
      overwrite: true,
      groupBy: 'tag',
      useCache: true,
      skipValidation: true,
      lazyLoading: true
    }
  },
  
  // React Query客户端示例
  'react-query': {
    method: 'generate-api-client-optimized',
    params: {
      swaggerUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
      outputDir: path.join(outputDir, 'react-query'),
      clientType: 'react-query',
      overwrite: true,
      groupBy: 'tag',
      useCache: true
    }
  }
};

// 选择示例
const exampleName = process.argv[2] || 'standard';
const exampleConfig = examples[exampleName] || examples.standard;

// 显示开始消息
console.log(`🚀 开始运行 ${exampleName} 示例`);
console.log(`🔨 生成 ${exampleConfig.params.clientType} 客户端`);
console.log(`📁 输出目录: ${exampleConfig.params.outputDir}`);
console.log(`📊 API文档: ${exampleConfig.params.swaggerUrl}`);

// 连接MCP服务器并发送请求
const connection = connectToMcpServer();

// 监听响应
connection.onMessage((message) => {
  if (message.type === 'result') {
    const result = JSON.parse(message.content[0].text);
    
    if (result.success) {
      console.log('\n✅ 客户端代码生成成功!');
      console.log(`📊 生成了 ${result.files.length} 个文件:`);
      
      // 显示文件路径
      result.files.forEach(file => {
        const relativePath = path.relative(process.cwd(), file);
        console.log(`  - ${relativePath}`);
      });
      
      // 显示警告信息
      if (result.warnings && result.warnings.length > 0) {
        console.log('\n⚠️ 警告:');
        result.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      }
      
      // 显示进度信息
      if (result.progress && result.progress.length > 0) {
        console.log('\n📈 进度信息:');
        result.progress.forEach(({ progress, message }) => {
          console.log(`  - ${Math.round(progress * 100)}%: ${message}`);
        });
      }
    } else {
      console.error('❌ 生成失败:', result.error);
    }
    
    // 关闭连接
    connection.close();
    process.exit(0);
  }
});

// 发送请求
connection.send({
  type: 'request',
  method: exampleConfig.method,
  params: exampleConfig.params
});

console.log(`�� 请求已发送，等待结果...`); 