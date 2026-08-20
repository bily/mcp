/**
 * Swagger MCP工具服务器演示
 * 这个脚本展示了如何使用Swagger MCP工具生成TypeScript类型和API客户端
 */
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// 创建输出目录
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Petstore API地址
const petstoreUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';

// 配置选项
const demoConfig = {
  apiUrl: petstoreUrl,
  outputDir: outputDir,
  typeFilename: 'petstore-types.ts',
  clientFilename: 'petstore-client.ts',
  clientType: 'fetch'
};

// 启动MCP服务器进程
console.log('启动Swagger MCP工具服务器...');
const serverProc = spawn('node', ['dist/mcp-tools-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 处理服务器输出
let serverReady = false;
serverProc.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[服务器]:', output);
  
  if (output.includes('MCP工具服务器已启动')) {
    serverReady = true;
    startDemo();
  }
});

serverProc.stderr.on('data', (data) => {
  console.error('[服务器错误]:', data.toString());
});

// 启动演示流程
function startDemo() {
  console.log('\n===== Swagger MCP工具演示 =====');
  console.log(`将从 ${demoConfig.apiUrl} 生成API客户端和类型定义`);
  console.log(`输出目录: ${demoConfig.outputDir}`);
  
  rl.question('\n按回车键开始演示...', () => {
    runClientProcess();
  });
}

// 运行客户端进程与服务器通信
function runClientProcess() {
  console.log('\n1. 解析Swagger文档');
  
  // 在这里，我们模拟了客户端与服务器的通信
  // 实际应用中，这将由FastMCP客户端处理
  
  // 模拟解析Swagger
  setTimeout(() => {
    console.log('✅ 成功解析Swagger文档');
    console.log('\n2. 生成TypeScript类型定义');
    
    setTimeout(() => {
      const typesPath = path.join(outputDir, demoConfig.typeFilename);
      console.log(`✅ 成功生成类型定义: ${typesPath}`);
      console.log('\n3. 生成API客户端');
      
      setTimeout(() => {
        const clientPath = path.join(outputDir, demoConfig.clientFilename);
        console.log(`✅ 成功生成API客户端: ${clientPath}`);
        
        // 完成演示
        finishDemo();
      }, 1000);
    }, 1000);
  }, 1000);
}

// 完成演示
function finishDemo() {
  console.log('\n===== 演示完成 =====');
  console.log('要实际测试工具，请使用以下命令:');
  console.log('\n在一个终端运行服务器:');
  console.log('  node dist/mcp-tools-server.js');
  console.log('\n在另一个终端运行客户端:');
  console.log('  node tools-client.js');
  
  // 清理资源
  serverProc.kill();
  rl.close();
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  serverProc.kill();
  rl.close();
  process.exit(0);
}); 