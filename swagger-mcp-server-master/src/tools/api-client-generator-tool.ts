/**
 * API Client Generator MCP Tool
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClientGenerator, ApiClientGeneratorOptions } from '../generators/api-client-generator';

// MCP tool names and descriptions
const API_CLIENT_GENERATOR_TOOL_NAME = 'generate-api-client';
const API_CLIENT_GENERATOR_TOOL_DESCRIPTION = 'Generate API client code from Swagger/OpenAPI document.';

// Optimized version tool names and descriptions
const OPTIMIZED_API_CLIENT_GENERATOR_TOOL_NAME = 'generate-api-client-optimized';
const OPTIMIZED_API_CLIENT_GENERATOR_TOOL_DESCRIPTION = 'Generate API client code from Swagger/OpenAPI document (optimized version with caching and large document support).';

/**
 * API Client Generator Tool Class
 */
export class ApiClientGeneratorTool {
  name = API_CLIENT_GENERATOR_TOOL_NAME;
  description = API_CLIENT_GENERATOR_TOOL_DESCRIPTION;
  optimizedName = OPTIMIZED_API_CLIENT_GENERATOR_TOOL_NAME;
  optimizedDescription = OPTIMIZED_API_CLIENT_GENERATOR_TOOL_DESCRIPTION;

  // Define parameter schema
  schema = z.object({
    /**
     * Swagger/OpenAPI document URL
     */
    swaggerUrl: z.string().describe('Swagger/OpenAPI document URL'),
    
    /**
     * Output directory
     */
    outputDir: z.string().optional().describe('Output directory'),
    
    /**
     * Whether to overwrite existing files
     */
    overwrite: z.boolean().optional().describe('Whether to overwrite existing files'),
    
    /**
     * File prefix
     */
    filePrefix: z.string().optional().describe('File prefix'),
    
    /**
     * File suffix
     */
    fileSuffix: z.string().optional().describe('File suffix'),
    
    /**
     * API client technology stack
     */
    clientType: z.enum(['axios', 'fetch', 'react-query']).optional().describe('API client technology stack'),
    
    /**
     * Whether to generate type imports
     */
    generateTypeImports: z.boolean().optional().describe('Whether to generate type imports'),
    
    /**
     * Types import path
     */
    typesImportPath: z.string().optional().describe('Types import path'),
    
    /**
     * Grouping method
     */
    groupBy: z.enum(['tag', 'path', 'none']).optional().describe('Grouping method'),
    
    /**
     * Include tags filter
     */
    includeTags: z.array(z.string()).optional().describe('Include tags filter'),
    
    /**
     * Exclude tags filter
     */
    excludeTags: z.array(z.string()).optional().describe('Exclude tags filter'),
    
    /**
     * Request headers
     */
    headers: z.record(z.string()).optional().describe('Request headers')
  });

  // Define optimized parameter schema
  optimizedSchema = this.schema.extend({
    /**
     * Whether to use cache
     */
    useCache: z.boolean().optional().describe('Whether to use cache'),
    
    /**
     * Cache TTL in minutes
     */
    cacheTTLMinutes: z.number().optional().describe('Cache TTL in minutes'),
    
    /**
     * Whether to skip validation
     */
    skipValidation: z.boolean().optional().describe('Whether to skip validation'),
    
    /**
     * Whether to use lazy loading
     */
    lazyLoading: z.boolean().optional().describe('Whether to use lazy loading')
  });

  /**
   * Register tool on the MCP server
   */
  register(server: McpServer) {
    // 注册标准版
    server.tool(
      this.name,
      this.description,
      this.schema.shape,
      async (params) => {
        return await this.execute(params);
      }
    );

    // 注册优化版
    server.tool(
      this.optimizedName,
      this.optimizedDescription,
      this.optimizedSchema.shape,
      async (params) => {
        // 设置优化版默认选项
        const optimizedParams = {
          ...params,
          useCache: params.useCache !== false,
          lazyLoading: params.lazyLoading !== false,
          skipValidation: params.skipValidation || false
        };
        return await this.execute(optimizedParams);
      }
    );
    
    console.log(`✅ 已注册API客户端生成器工具: ${this.name}, ${this.optimizedName}`);
  }

  /**
   * Execute API client generation
   */
  async execute(params: z.infer<typeof this.optimizedSchema>) {
    try {
      console.log(`[ApiClientGeneratorTool] 开始生成API客户端: ${params.swaggerUrl}`);
      
      // 创建生成器实例
      const generator = new ApiClientGenerator();
      
      // 记录进度的函数
      let progressUpdates: { progress: number, message: string }[] = [];
      const progressCallback = (progress: number, message: string) => {
        progressUpdates.push({ progress, message });
      };
      
      // 执行生成
      const result = await generator.generate({
        ...params,
        progressCallback
      } as ApiClientGeneratorOptions);
      
      // 处理结果
      if (result.success) {
        console.log(`[ApiClientGeneratorTool] 客户端生成成功，生成了 ${result.files.length} 个文件`);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                files: result.files,
                warnings: result.warnings,
                progress: progressUpdates
              }, null, 2)
            }
          ]
        };
      } else {
        console.error(`[ApiClientGeneratorTool] 客户端生成失败: ${result.error}`);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: result.error,
                progress: progressUpdates
              }, null, 2)
            }
          ]
        };
      }
    } catch (error) {
      console.error(`[ApiClientGeneratorTool] 执行异常:`, error);
      
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