/**
 * Template Manager MCP Tool
 * Provides template query, add, update and delete functionality
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TemplateManager, TemplateType, FrameworkType, Template } from '../templates/template-manager';

// MCP tool names and descriptions
const TEMPLATE_LIST_TOOL_NAME = 'template-list';
const TEMPLATE_LIST_TOOL_DESCRIPTION = 'Get available code generation template list';

const TEMPLATE_GET_TOOL_NAME = 'template-get';
const TEMPLATE_GET_TOOL_DESCRIPTION = 'Get specific template content';

const TEMPLATE_SAVE_TOOL_NAME = 'template-save';
const TEMPLATE_SAVE_TOOL_DESCRIPTION = 'Save or update template';

const TEMPLATE_DELETE_TOOL_NAME = 'template-delete';
const TEMPLATE_DELETE_TOOL_DESCRIPTION = 'Delete custom template';

/**
 * Template Manager Tool Class
 */
export class TemplateManagerTool {
  private templateManager: TemplateManager;
  private initialized: boolean = false;
  
  constructor() {
    this.templateManager = new TemplateManager();
  }
  
  /**
   * Register tools on the MCP server
   */
  async register(server: McpServer) {
    // 确保模板管理器已初始化
    if (!this.initialized) {
      await this.templateManager.initialize();
      this.initialized = true;
    }
    
    // 注册获取模板列表工具
    server.tool(
      TEMPLATE_LIST_TOOL_NAME,
      TEMPLATE_LIST_TOOL_DESCRIPTION,
      {
        type: z.enum(['all', 'api-client', 'typescript-types', 'config-file']).optional().describe('Template type filter'),
        framework: z.enum(['axios', 'fetch', 'react-query', 'swr', 'angular', 'vue']).optional().describe('Framework type filter (only for API client and config file templates)'),
        includeContent: z.boolean().optional().describe('Whether to include template content')
      },
      async (params) => {
        return await this.listTemplates(params);
      }
    );
    
    // 注册获取单个模板工具
    server.tool(
      TEMPLATE_GET_TOOL_NAME,
      TEMPLATE_GET_TOOL_DESCRIPTION,
      {
        id: z.string().describe('Template ID'),
      },
      async (params) => {
        return await this.getTemplate(params);
      }
    );
    
    // 注册保存模板工具
    server.tool(
      TEMPLATE_SAVE_TOOL_NAME,
      TEMPLATE_SAVE_TOOL_DESCRIPTION,
      {
        id: z.string().describe('Template ID'),
        name: z.string().describe('Template name'),
        type: z.enum(['api-client', 'typescript-types', 'config-file']).describe('Template type'),
        framework: z.enum(['axios', 'fetch', 'react-query', 'swr', 'angular', 'vue']).optional().describe('Framework type (only for API client and config file templates)'),
        content: z.string().describe('Template content'),
        description: z.string().optional().describe('Template description')
      },
      async (params) => {
        return await this.saveTemplate(params);
      }
    );
    
    // 注册删除模板工具
    server.tool(
      TEMPLATE_DELETE_TOOL_NAME,
      TEMPLATE_DELETE_TOOL_DESCRIPTION,
      {
        id: z.string().describe('Template ID')
      },
      async (params) => {
        return await this.deleteTemplate(params);
      }
    );
    
    console.log(`✅ 已注册模板管理器工具: ${TEMPLATE_LIST_TOOL_NAME}, ${TEMPLATE_GET_TOOL_NAME}, ${TEMPLATE_SAVE_TOOL_NAME}, ${TEMPLATE_DELETE_TOOL_NAME}`);
  }
  
  /**
   * 获取模板列表
   */
  private async listTemplates(params: {
    type?: string;
    framework?: string;
    includeContent?: boolean;
  }): Promise<any> {
    try {
      let templates: Template[] = [];
      
      // 根据类型过滤
      if (params.type && params.type !== 'all') {
        const templateType = params.type as TemplateType;
        templates = this.templateManager.getTemplatesByType(templateType);
        
        // 根据框架类型进一步过滤
        if (params.framework && (templateType === TemplateType.API_CLIENT || templateType === TemplateType.CONFIG_FILE)) {
          const frameworkType = params.framework as FrameworkType;
          templates = templates.filter(template => template.framework === frameworkType);
        }
      } else {
        templates = this.templateManager.getAllTemplates();
        
        // 根据框架类型过滤
        if (params.framework) {
          const frameworkType = params.framework as FrameworkType;
          templates = templates.filter(template => template.framework === frameworkType);
        }
      }
      
      // 处理返回结果
      const result = templates.map(template => {
        const { content, ...rest } = template;
        
        // 如果不需要包含内容，则省略
        if (!params.includeContent) {
          return rest;
        }
        
        return template;
      });
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              templates: result
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('[TemplateManagerTool] 获取模板列表失败:', error);
      
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
  
  /**
   * 获取模板
   */
  private async getTemplate(params: { id: string }): Promise<any> {
    try {
      const template = this.templateManager.getTemplate(params.id);
      
      if (!template) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: `Template not found with ID: ${params.id}`
              }, null, 2)
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              template
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('[TemplateManagerTool] 获取模板失败:', error);
      
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
  
  /**
   * 保存模板
   */
  private async saveTemplate(params: {
    id: string;
    name: string;
    type: string;
    framework?: string;
    content: string;
    description?: string;
  }): Promise<any> {
    try {
      const template = {
        id: params.id,
        name: params.name,
        type: params.type as TemplateType,
        framework: params.framework as FrameworkType | undefined,
        content: params.content,
        description: params.description
      };
      
      const result = await this.templateManager.saveCustomTemplate(template);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              template: result
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('[TemplateManagerTool] 保存模板失败:', error);
      
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
  
  /**
   * 删除模板
   */
  private async deleteTemplate(params: { id: string }): Promise<any> {
    try {
      const success = await this.templateManager.deleteCustomTemplate(params.id);
      
      if (!success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: `Failed to delete template with ID: ${params.id}. It may be a built-in template or not exist.`
              }, null, 2)
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: `Template with ID: ${params.id} has been deleted.`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('[TemplateManagerTool] 删除模板失败:', error);
      
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