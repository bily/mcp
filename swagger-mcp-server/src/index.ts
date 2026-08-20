/**
 * Swagger MCP 服务器主入口
 */
import { promises as fs } from 'fs';
import path from 'path';
import { SwaggerParserTool } from './tools/swagger-parser-tool';
import { OptimizedSwaggerParserTool } from './tools/optimized-swagger-parser-tool';
import { TypeScriptTypesGeneratorTool } from './tools/typescript-types-generator-tool';
import { ApiClientGeneratorTool } from './tools/api-client-generator-tool';
import { FileWriterTool } from './tools/file-writer-tool';
import { TemplateManagerTool } from './tools/template-manager-tool';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// HTTP协议未合并到正式仓库，暂时移除
// import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

// 定义配置类型
export interface SwaggerMcpConfig {
  name: string;
  version: string;
  transport: 'stdio'; // 移除HTTP选项
  port?: number;
}

/**
 * 主函数，读取配置文件并启动服务器
 */
export async function main(configPath = './swagger-mcp-config.json'): Promise<void> {
  try {
    // 读取配置文件
    console.log(`加载配置文件: ${configPath}`);
    const configContent = await fs.readFile(configPath, 'utf8');
    const config: SwaggerMcpConfig = JSON.parse(configContent);
    
    // 启动服务器
    await createMcpServer(config);
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

/**
 * 创建并启动MCP服务器
 */
export async function createMcpServer(config: {
  name: string;
  version: string;
  transport: 'stdio';
  port?: number;
}): Promise<void> {
  // 创建MCP服务器
  const server = new McpServer({
    name: config.name,
    version: config.version,
  });
  
  // 注册工具
  new SwaggerParserTool().register(server);
  new OptimizedSwaggerParserTool().register(server);
  new TypeScriptTypesGeneratorTool().register(server);
  new ApiClientGeneratorTool().register(server);
  new FileWriterTool().register(server);
  new TemplateManagerTool().register(server);
  
  // 仅使用stdio传输
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.log(`🚀 MCP服务器已启动，使用stdio传输`);
}

// 如果直接运行此文件，则启动main函数
if (require.main === module) {
  // 获取命令行参数
  const configPath = process.argv[2];
  main(configPath);
}

// 导出API
export { createMcpServer as createSwaggerMcpServer };
export { createMcpServer as startSwaggerMcpServer };
// 确保swagger-parser.ts文件存在并导出SwaggerApiParser
export { SwaggerApiParser } from './swagger-parser';
export { OptimizedSwaggerApiParser } from './optimized-swagger-parser';
// 导出生成器相关内容
export * from './generators/code-generator';
export * from './generators/typescript-types-generator';
export * from './generators/api-client-generator';
// 导出模板相关内容
export * from './templates'; 