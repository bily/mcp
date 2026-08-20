/**
 * 优化的Swagger解析器示例
 * 这个示例演示如何使用MCP的优化Swagger解析工具
 * 
 * 使用方法：
 * 1. 运行MCP服务器: node src/index.js
 * 2. 执行此示例: node examples/optimized-swagger-parser-example.js
 */

// 示例1: 使用标准解析工具
const standardExample = {
  method: 'parse-swagger',
  params: {
    url: 'https://petstore3.swagger.io/api/v3/openapi.json',
    includeSchemas: true,
    includeDetails: true
  }
};

// 示例2: 使用优化解析工具
const optimizedExample = {
  method: 'parse-swagger-optimized',
  params: {
    url: 'https://petstore3.swagger.io/api/v3/openapi.json',
    includeSchemas: true,
    includeDetails: true,
    useCache: true,
    skipValidation: true,
    cacheTTLMinutes: 60,
    lazyLoading: false
  }
};

// 示例3: 使用轻量级解析工具（适用于大型文档）
const liteExample = {
  method: 'parse-swagger-lite',
  params: {
    url: 'https://petstore3.swagger.io/api/v3/openapi.json',
    includeSchemas: false,
    includeDetails: false,
    useCache: true,
    skipValidation: true,
    filterTag: 'pet'
  }
};

// 示例4: 使用路径过滤
const pathFilterExample = {
  method: 'parse-swagger-optimized',
  params: {
    url: 'https://petstore3.swagger.io/api/v3/openapi.json',
    pathPrefix: '/pet',
    useCache: true,
    skipValidation: true
  }
};

// 选择要运行的示例
const example = process.argv[2] === 'lite' ? liteExample :
               process.argv[2] === 'path' ? pathFilterExample :
               process.argv[2] === 'standard' ? standardExample :
               optimizedExample;

// 发送请求到MCP服务器
const http = require('http');
const request = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  ...example
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(request)
  }
};

console.log(`发送请求: ${example.method}`);
console.time('解析耗时');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.timeEnd('解析耗时');
    
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('错误:', response.error);
      } else if (response.result && response.result.content) {
        const content = JSON.parse(response.result.content[0].text);
        
        console.log('解析结果:');
        console.log('- 成功状态:', content.success);
        console.log('- API信息:', content.info ? content.info.title : '无');
        console.log('- 操作数量:', content.operationsCount);
        if (content.schemas) {
          console.log('- 模式数量:', Object.keys(content.schemas).length);
        }
        if (content.progress !== undefined) {
          console.log('- 解析进度:', Math.round(content.progress * 100) + '%');
          console.log('- 进度消息:', content.progressMessage);
        }
      }
    } catch (e) {
      console.error('解析响应失败:', e);
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.write(request);
req.end(); 