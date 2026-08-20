/**
 * TypeScript Type Generator MCP Tool
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TypeScriptTypesGenerator, TypeScriptTypesGeneratorOptions } from '../generators/typescript-types-generator';

// MCP tool names and descriptions
const TS_TYPES_GENERATOR_TOOL_NAME = 'generate-typescript-types';
const TS_TYPES_GENERATOR_TOOL_DESCRIPTION = 'Generate TypeScript type definitions from Swagger/OpenAPI document.';

// Optimized version tool names and descriptions
const TS_TYPES_GENERATOR_OPTIMIZED_TOOL_NAME = 'generate-typescript-types-optimized';
const TS_TYPES_GENERATOR_OPTIMIZED_TOOL_DESCRIPTION = 'Generate TypeScript type definitions from Swagger/OpenAPI document with optimized options for caching and large document support.';

/**
 * TypeScript Type Generator Tool Class
 */
export class TypeScriptTypesGeneratorTool {
  name = TS_TYPES_GENERATOR_TOOL_NAME;
  description = TS_TYPES_GENERATOR_TOOL_DESCRIPTION;

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
     * Whether to use namespace
     */
    useNamespace: z.boolean().optional().describe('Whether to use namespace for wrapping types'),
    
    /**
     * Namespace name
     */
    namespace: z.string().optional().describe('Namespace name'),
    
    /**
     * Whether to generate enums
     */
    generateEnums: z.boolean().optional().describe('Whether to generate enum types'),
    
    /**
     * Whether to use strict types
     */
    strictTypes: z.boolean().optional().describe('Whether to use strict types'),
    
    /**
     * Excluded schema names
     */
    excludeSchemas: z.array(z.string()).optional().describe('Array of schema names to exclude'),
    
    /**
     * Included schema names
     */
    includeSchemas: z.array(z.string()).optional().describe('Array of schema names to include'),
    
    /**
     * Whether to generate index file
     */
    generateIndex: z.boolean().optional().describe('Whether to generate an index file'),
    
    /**
     * Request headers
     */
    headers: z.record(z.string()).optional().describe('Request headers'),
    
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
    // 注册标准工具
    server.tool(
      this.name,
      this.description,
      this.schema.shape,
      async (params) => {
        // 使用默认参数
        const options = {
          ...params,
          useCache: true,
          skipValidation: true,
          lazyLoading: false
        };
        return await this.execute(options);
      }
    );
    
    // 注册优化版工具
    server.tool(
      TS_TYPES_GENERATOR_OPTIMIZED_TOOL_NAME,
      TS_TYPES_GENERATOR_OPTIMIZED_TOOL_DESCRIPTION,
      this.schema.shape,
      async (params) => {
        // 默认启用性能优化选项
        const options = {
          ...params,
          useCache: params.useCache !== false,
          skipValidation: params.skipValidation !== false,
          lazyLoading: params.lazyLoading !== false
        };
        return await this.execute(options);
      }
    );
  }

  /**
   * Execute TypeScript type generation
   */
  async execute(params: z.infer<typeof this.schema>) {
    let progress = 0;
    let progressMessage = '';
    
    // 定义进度回调
    const progressCallback = (newProgress: number, message: string) => {
      progress = newProgress;
      progressMessage = message;
      console.log(`[Progress] ${Math.round(newProgress * 100)}%: ${message}`);
    };
    
    try {
      console.log(`[TypeScriptTypesGeneratorTool] 开始生成TypeScript类型: ${params.swaggerUrl}`);
      console.log(`[TypeScriptTypesGeneratorTool] 缓存: ${params.useCache ? '启用' : '禁用'}, 懒加载: ${params.lazyLoading ? '启用' : '禁用'}`);
      
      // 创建生成器实例
      const generator = new TypeScriptTypesGenerator();
      
      // 执行生成
      const result = await generator.generate({
        ...params,
        progressCallback
      } as TypeScriptTypesGeneratorOptions);
      
      // 处理结果
      if (result.success) {
        console.log(`[TypeScriptTypesGeneratorTool] 类型生成成功，生成了 ${result.files.length} 个文件`);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                files: result.files,
                warnings: result.warnings,
                progress: 1.0,
                progressMessage: '完成'
              }, null, 2)
            }
          ]
        };
      } else {
        console.error(`[TypeScriptTypesGeneratorTool] 类型生成失败: ${result.error}`);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: result.error,
                progress: progress,
                progressMessage: progressMessage
              }, null, 2)
            }
          ]
        };
      }
    } catch (error) {
      console.error(`[TypeScriptTypesGeneratorTool] 执行异常:`, error);
      
      // 返回错误结果
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              progress: progress,
              progressMessage: progressMessage
            }, null, 2)
          }
        ]
      };
    }
  }
} 