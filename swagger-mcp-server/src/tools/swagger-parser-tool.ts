/**
 * Swagger Parser MCP Tool
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OptimizedSwaggerApiParser } from '../optimized-swagger-parser';

// MCP tool names and descriptions
const SWAGGER_PARSER_TOOL_NAME = 'parse-swagger';
const SWAGGER_PARSER_TOOL_DESCRIPTION = 'Parse Swagger/OpenAPI document and return API operation information.';

/**
 * Swagger Parser Tool Class
 * Note: This is the original tool, kept for backward compatibility
 * Recommended to use 'parse-swagger-optimized' or 'parse-swagger-lite' tools
 */
export class SwaggerParserTool {
  name = SWAGGER_PARSER_TOOL_NAME;
  description = SWAGGER_PARSER_TOOL_DESCRIPTION;

  // Define parameter schema
  schema = z.object({
    /**
     * Swagger/OpenAPI document URL
     */
    url: z.string().describe('Swagger/OpenAPI document URL'),
    
    /**
     * Request headers
     */
    headers: z.record(z.string()).optional().describe('Request headers'),
    
    /**
     * Whether to include schema definitions
     */
    includeSchemas: z.boolean().optional().describe('Whether to include schema definitions'),
    
    /**
     * Whether to include all details
     */
    includeDetails: z.boolean().optional().describe('Whether to include all details like request bodies, responses, etc.')
  });

  /**
   * Register tool on the MCP server
   */
  register(server: McpServer) {
    server.tool(
      this.name,
      this.description,
      this.schema.shape,
      async ({ url, headers = {}, includeSchemas = false, includeDetails = false }) => {
        return await this.execute({ url, headers, includeSchemas, includeDetails });
      }
    );
  }

  /**
   * Execute Swagger parsing
   */
  async execute({
    url,
    headers = {},
    includeSchemas = false,
    includeDetails = false
  }: z.infer<typeof this.schema>) {
    try {
      console.log(`[SwaggerParserTool] 解析Swagger文档: ${url}`);
      
      // 创建解析器实例
      const parser = new OptimizedSwaggerApiParser({ 
        url, 
        headers, 
        useCache: true, 
        skipValidation: true 
      });
      
      // 解析API文档
      const api = await parser.fetchApi();
      
      // 获取API操作
      const operations = await parser.getAllOperations();
      
      // 构建结果对象
      const result: any = {
        success: true,
        info: {
          title: api.info.title,
          version: api.info.version,
          description: api.info.description
        },
        operationsCount: operations.length,
        operations: operations.map(op => {
          // 基本操作信息
          const operation = {
            operationId: op.operationId,
            method: op.method,
            path: op.path,
            summary: op.summary,
            tags: op.tags
          };
          
          // 如果需要详细信息，则包含参数和响应
          if (includeDetails) {
            return {
              ...operation,
              parameters: op.parameters,
              requestBody: op.requestBody,
              responses: op.responses
            };
          }
          
          return operation;
        })
      };
      
      // 如果需要模式定义，则添加到结果中
      if (includeSchemas) {
        result.schemas = await parser.getAllSchemas();
      }
      
      console.log(`[SwaggerParserTool] 解析完成，找到 ${operations.length} 个API操作`);
      
      // 返回结果
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error(`[SwaggerParserTool] 解析失败:`, error);
      
      // 返回错误结果
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }
        ]
      };
    }
  }
} 