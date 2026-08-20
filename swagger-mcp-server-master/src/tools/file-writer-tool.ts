/**
 * MCP File Writer Tool
 * Provides the ability to write files to the local file system, with support for automatic directory creation
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// File writer parameter validation schema
const fileWriterSchema = z.object({
  filePath: z.string().min(1).describe('Complete path of the file'),
  content: z.string().describe('Content to be written to the file'),
  createDirs: z.boolean().optional().default(true).describe('Whether to automatically create parent directories if they do not exist'),
  append: z.boolean().optional().default(false).describe('Whether to append to an existing file instead of overwriting it'),
  encoding: z.string().optional().default('utf8').describe('File encoding'),
});

// File writer tool type definition
type FileWriterParams = z.infer<typeof fileWriterSchema>;

/**
 * File Writer Tool Class
 * Provides the ability to write files to the local file system
 */
export class FileWriterTool {
  // Tool name and description
  readonly name = 'file_writer';
  readonly description = 'Write content to the specified file path, with support for automatic directory creation';
  readonly version = '1.0.0';
  readonly schema = fileWriterSchema;

  /**
   * Register the tool with the MCP server
   */
  register(server: McpServer): void {
    server.tool(
      this.name, 
      this.description,
      this.schema.shape,
      async (params) => {
        // 验证参数
        const result = await this.writeFile(params);
        
        // 返回符合MCP要求的格式
        return {
          ...result,
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );
  }

  /**
   * Implementation of file writing
   */
  async writeFile(params: FileWriterParams): Promise<object> {
    try {
      const { filePath, content, createDirs, append, encoding } = params;
      
      // 确保父目录存在
      if (createDirs) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      }
      
      // 写入文件
      if (append) {
        await fs.appendFile(filePath, content, { encoding: encoding as BufferEncoding });
      } else {
        await fs.writeFile(filePath, content, { encoding: encoding as BufferEncoding });
      }
      
      // 获取文件信息
      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        message: `文件已${append ? '追加' : '写入'}: ${filePath}`,
      };
    } catch (error) {
      console.error('文件写入失败:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath: params.filePath,
      };
    }
  }
} 