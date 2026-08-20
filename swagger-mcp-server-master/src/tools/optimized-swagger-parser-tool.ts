/**
 * Optimized Swagger Parser MCP Tool
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OptimizedSwaggerApiParser } from '../optimized-swagger-parser';

// MCP tool names and descriptions
const OPTIMIZED_SWAGGER_PARSER_TOOL_NAME = 'parse-swagger-optimized';
const OPTIMIZED_SWAGGER_PARSER_TOOL_DESCRIPTION = 'Parse Swagger/OpenAPI document using optimized parser with caching and large document support.';

// Lite version tool names and descriptions
const LITE_SWAGGER_PARSER_TOOL_NAME = 'parse-swagger-lite';
const LITE_SWAGGER_PARSER_TOOL_DESCRIPTION = 'Lightweight parsing of Swagger/OpenAPI document, faster but returns only basic information (suitable for large documents).';

/**
 * Optimized Swagger Parser Tool Class
 */
export class OptimizedSwaggerParserTool {
  name = OPTIMIZED_SWAGGER_PARSER_TOOL_NAME;
  description = OPTIMIZED_SWAGGER_PARSER_TOOL_DESCRIPTION;

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
    includeDetails: z.boolean().optional().describe('Whether to include all details like request bodies, responses, etc.'),
    
    /**
     * Whether to skip validation
     */
    skipValidation: z.boolean().optional().describe('Whether to skip validation, used for handling non-fully compliant API documents'),
    
    /**
     * Whether to use cache
     */
    useCache: z.boolean().optional().describe('Whether to use cache'),
    
    /**
     * Cache TTL in minutes
     */
    cacheTTLMinutes: z.number().optional().describe('Cache TTL in minutes'),
    
    /**
     * Whether to use lazy loading for schema parsing
     */
    lazyLoading: z.boolean().optional().describe('Whether to use lazy loading for schema parsing'),
    
    /**
     * Filter operations by tag
     */
    filterTag: z.string().optional().describe('Filter operations by tag'),
    
    /**
     * Filter operations by path prefix
     */
    pathPrefix: z.string().optional().describe('Filter operations by path prefix'),
  });

  /**
   * Register tool on the MCP server
   */
  register(server: McpServer) {
    // 注册完整版解析工具
    server.tool(
      this.name,
      this.description,
      this.schema.shape,
      async ({ 
        url, 
        headers = {}, 
        includeSchemas = false, 
        includeDetails = false,
        skipValidation = true,
        useCache = true,
        cacheTTLMinutes = 60,
        lazyLoading = false,
        filterTag,
        pathPrefix
      }) => {
        return await this.execute({ 
          url, 
          headers, 
          includeSchemas, 
          includeDetails,
          skipValidation,
          useCache,
          cacheTTLMinutes,
          lazyLoading,
          filterTag,
          pathPrefix
        });
      }
    );
    
    // 注册轻量版解析工具
    server.tool(
      LITE_SWAGGER_PARSER_TOOL_NAME,
      LITE_SWAGGER_PARSER_TOOL_DESCRIPTION,
      this.schema.shape,
      async ({ 
        url, 
        headers = {}, 
        includeSchemas = false, 
        includeDetails = false,
        skipValidation = true,
        useCache = true,
        cacheTTLMinutes = 60,
        filterTag,
        pathPrefix
      }) => {
        return await this.execute({ 
          url, 
          headers, 
          includeSchemas, 
          includeDetails,
          skipValidation,
          useCache,
          cacheTTLMinutes,
          lazyLoading: true, // 强制使用懒加载
          filterTag,
          pathPrefix
        });
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
    includeDetails = false,
    skipValidation = true,
    useCache = true,
    cacheTTLMinutes = 60,
    lazyLoading = false,
    filterTag,
    pathPrefix
  }: z.infer<typeof this.schema> & {
    cacheTTLMinutes?: number;
  }) {
    let progress = 0;
    let progressMessage = '';
    
    // 进度回调函数
    const progressCallback = (newProgress: number, message: string) => {
      progress = newProgress;
      progressMessage = message;
      console.log(`[Progress] ${Math.round(newProgress * 100)}%: ${message}`);
    };
    
    try {
      console.log(`[OptimizedSwaggerParserTool] 解析Swagger文档: ${url}`);
      console.log(`[OptimizedSwaggerParserTool] 缓存: ${useCache ? '启用' : '禁用'}, 懒加载: ${lazyLoading ? '启用' : '禁用'}`);
      
      // 创建解析器实例
      const parser = new OptimizedSwaggerApiParser({
        url,
        headers,
        skipValidation,
        useCache,
        cacheTTL: cacheTTLMinutes * 60 * 1000, // 转换为毫秒
        lazyLoading,
        progressCallback
      });
      
      // 解析API文档
      const api = await parser.fetchApi();
      
      // 获取API操作
      let operations;
      if (filterTag) {
        operations = await parser.getOperationsByTag(filterTag);
      } else if (pathPrefix) {
        operations = await parser.getOperationsByPathPrefix(pathPrefix);
      } else {
        operations = await parser.getAllOperations();
      }
      
      // 构建结果对象
      const result: any = {
        success: true,
        progress: progress,
        progressMessage: progressMessage,
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
      
      // 如果需要模式定义
      if (includeSchemas) {
        if (lazyLoading) {
          // 使用懒加载时，只获取必要的schema
          result.schemas = {};
          
          // 获取所有操作中引用的模式
          const referencedSchemas = new Set<string>();
          
          // 处理requestBody和responses中的引用
          for (const op of operations) {
            // 处理requestBody
            if (op.requestBody && typeof op.requestBody === 'object') {
              this.collectSchemaRefs(op.requestBody, referencedSchemas);
            }
            
            // 处理responses
            if (op.responses) {
              for (const response of Object.values(op.responses)) {
                if (response && typeof response === 'object') {
                  this.collectSchemaRefs(response, referencedSchemas);
                }
              }
            }
          }
          
          // 获取引用的模式
          for (const schemaName of referencedSchemas) {
            const schema = await parser.getSchema(schemaName);
            if (schema) {
              result.schemas[schemaName] = schema;
            }
          }
        } else {
          // 不使用懒加载时，获取所有模式
          result.schemas = await parser.getAllSchemas();
        }
      }
      
      console.log(`[OptimizedSwaggerParserTool] 解析完成，找到 ${operations.length} 个API操作`);
      
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
      console.error(`[OptimizedSwaggerParserTool] 解析失败:`, error);
      
      // 返回错误结果
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              progress: progress,
              progressMessage: progressMessage,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }
        ]
      };
    }
  }
  
  /**
   * Collect schema references
   */
  private collectSchemaRefs(obj: any, refs: Set<string>): void {
    if (!obj) return;
    
    // 处理直接引用
    if (obj.$ref && typeof obj.$ref === 'string') {
      const parts = obj.$ref.split('/');
      const schemaName = parts[parts.length - 1];
      refs.add(schemaName);
      return;
    }
    
    // 处理内容对象
    if (obj.content && typeof obj.content === 'object') {
      for (const mediaType of Object.values(obj.content)) {
        if (mediaType && typeof mediaType === 'object' && 'schema' in mediaType) {
          this.collectSchemaRefs((mediaType as any).schema, refs);
        }
      }
    }
    
    // 处理模式对象
    if (obj.schema) {
      this.collectSchemaRefs(obj.schema, refs);
    }
    
    // 处理数组项
    if (obj.items) {
      this.collectSchemaRefs(obj.items, refs);
    }
    
    // 处理嵌套对象
    if (typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
          this.collectSchemaRefs(value, refs);
        }
      }
    }
  }
  
  /**
   * Clear cache
   */
  static clearCache(url?: string): void {
    OptimizedSwaggerApiParser.clearCache(url);
  }
} 