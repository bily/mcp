/**
 * TypeScript类型生成器示例
 * 这个示例演示如何使用MCP的TypeScript类型生成工具
 * 
 * 使用方法：
 * 1. 运行MCP服务器: node start-server.js
 * 2. 执行此示例: node examples/typescript-generator-example.js
 */

// 示例1: 使用标准类型生成工具
const standardExample = {
  method: 'generate-typescript-types',
  params: {
    swaggerUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
    outputDir: './generated/types',
    namespace: 'PetStore',
    useNamespace: true,
    strictTypes: true,
    generateEnums: true,
    generateIndex: true
  }
};

// 示例2: 使用优化类型生成工具
const optimizedExample = {
  method: 'generate-typescript-types-optimized',
  params: {
    swaggerUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
    outputDir: './generated/types-optimized',
    namespace: 'PetStoreAPI',
    useNamespace: true,
    strictTypes: true,
    generateEnums: true,
    generateIndex: true,
    useCache: true,
    skipValidation: true,
    lazyLoading: true
  }
};

// 示例3: 使用过滤器仅生成特定模式
const filteredExample = {
  method: 'generate-typescript-types-optimized',
  params: {
    swaggerUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
    outputDir: './generated/types-filtered',
    includeSchemas: ['Pet', 'Category', 'Tag'],
    namespace: 'PetStoreFiltered',
    useNamespace: true,
    useCache: true,
    lazyLoading: true
  }
};

// 选择要运行的示例
const example = process.argv[2] === 'optimized' ? optimizedExample :
               process.argv[2] === 'filtered' ? filteredExample :
               standardExample;

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
console.time('生成耗时');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.timeEnd('生成耗时');
    
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('错误:', response.error);
      } else if (response.result && response.result.content) {
        const content = JSON.parse(response.result.content[0].text);
        
        console.log('生成结果:');
        console.log('- 成功状态:', content.success);
        
        if (content.success) {
          console.log('- 生成的文件数量:', content.files.length);
          console.log('- 生成的文件路径:');
          content.files.forEach((file, index) => {
            if (index < 5 || index === content.files.length - 1) {
              console.log(`  - ${file}`);
            } else if (index === 5) {
              console.log(`  - ... 还有 ${content.files.length - 6} 个文件 ...`);
            }
          });
          
          if (content.warnings && content.warnings.length > 0) {
            console.log('- 警告:', content.warnings.length);
            content.warnings.slice(0, 3).forEach(warning => {
              console.log(`  - ${warning}`);
            });
            if (content.warnings.length > 3) {
              console.log(`  - ... 还有 ${content.warnings.length - 3} 个警告 ...`);
            }
          }
        } else {
          console.log('- 错误:', content.error);
        }
        
        if (content.progress !== undefined) {
          console.log('- 进度:', Math.round(content.progress * 100) + '%');
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