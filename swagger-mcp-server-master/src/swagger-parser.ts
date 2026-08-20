/**
 * Swagger/OpenAPI文档解析器
 */
import { promises as fs } from 'fs';
import axios from 'axios';
import { OpenAPIV3 } from 'openapi-types';
import SwaggerParser from '@apidevtools/swagger-parser';

/**
 * API操作接口
 */
export interface ApiOperation {
  /**
   * 操作ID
   */
  operationId: string;
  
  /**
   * HTTP方法
   */
  method: string;
  
  /**
   * API路径
   */
  path: string;
  
  /**
   * 操作摘要
   */
  summary?: string;
  
  /**
   * 操作描述
   */
  description?: string;
  
  /**
   * 标签列表
   */
  tags?: string[];
  
  /**
   * 参数列表
   */
  parameters?: OpenAPIV3.ParameterObject[];
  
  /**
   * 请求体
   */
  requestBody?: OpenAPIV3.RequestBodyObject;
  
  /**
   * 响应对象
   */
  responses?: Record<string, OpenAPIV3.ResponseObject>;
}

/**
 * Swagger解析器选项
 */
export interface SwaggerApiParserOptions {
  /**
   * Swagger/OpenAPI文档URL或本地文件路径
   */
  url: string;
  
  /**
   * 请求头信息
   */
  headers?: Record<string, string>;
  
  /**
   * 是否跳过严格验证
   */
  skipValidation?: boolean;
}

/**
 * Swagger API解析器类
 */
export class SwaggerApiParser {
  private url: string;
  private headers: Record<string, string>;
  private api?: OpenAPIV3.Document;
  private skipValidation: boolean;
  /**
   * 构造函数
   */
  constructor(options: SwaggerApiParserOptions) {
    this.url = options.url;
    this.headers = options.headers || {};
    this.skipValidation = options.skipValidation || false;
  }
  
  /**
   * 获取API文档
   */
  async fetchApi(): Promise<OpenAPIV3.Document> {
    if (this.api) {
      return this.api;
    }
    
    try {
      let apiData: any;
      let url = this.url;
      
      // 如果URL指向的是UI页面(doc.html或swagger-ui.html)
      if (url.includes('doc.html') || url.includes('swagger-ui.html')) {
        // 尝试猜测实际API文档URL
        const baseUrl = url.substring(0, url.lastIndexOf('/'));
        
        // 尝试常见的API端点
        const possibleEndpoints = [
          `${baseUrl}/v2/api-docs`,
          `${baseUrl}/v3/api-docs`,
          url.replace('doc.html', 'v2/api-docs'),
          url.replace('doc.html', 'v3/api-docs')
        ];
        
        // 尝试每个可能的端点
        for (const endpoint of possibleEndpoints) {
          try {
            // 完全移除，或使用debug级别的日志
            const response = await axios.get(endpoint, { headers: this.headers });
            if (response.data && (response.data.swagger || response.data.openapi)) {
              apiData = response.data;
              break;
            }
          } catch (e) {
            // 完全移除，或使用debug级别的日志
          }
        }
        
        if (!apiData) {
          throw new Error('无法找到有效的Swagger JSON文档，请直接提供API文档URL');
        }
      } else if (url.startsWith('http')) {
        // 从URL获取
        const response = await axios.get(url, { headers: this.headers });
        apiData = response.data;
      } else {
        // 从本地文件获取
        const content = await fs.readFile(url, 'utf8');
        apiData = JSON.parse(content);
      }
      
      // 验证并解析文档
      if (this.skipValidation) {
        // 使用parse方法，宽松解析
        this.api = await SwaggerParser.parse(apiData) as OpenAPIV3.Document;
      } else {
        try {
          // 尝试严格验证
          this.api = await SwaggerParser.validate(apiData) as OpenAPIV3.Document;
        } catch (error) {
          console.error('API文档验证失败，将使用宽松解析');
          // 验证失败时回退到宽松解析
          this.api = await SwaggerParser.parse(apiData) as OpenAPIV3.Document;
        }
      }
      
      return this.api;
    } catch (error) {
      throw new Error(`Failed to fetch API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 获取所有API操作
   */
  getAllOperations(): ApiOperation[] {
    if (!this.api) {
      return [];
    }
    
    const operations: ApiOperation[] = [];
    
    // 遍历所有路径
    for (const [path, pathItem] of Object.entries(this.api.paths || {})) {
      if (!pathItem) continue;
      
      // 遍历所有HTTP方法
      for (const method of ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const) {
        const operationObject = pathItem[method];
        if (!operationObject) continue;
        
        // 添加到操作列表
        operations.push({
          operationId: operationObject.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
          method,
          path,
          summary: operationObject.summary,
          description: operationObject.description,
          tags: operationObject.tags,
          parameters: (pathItem.parameters || []).concat(operationObject.parameters || []) as OpenAPIV3.ParameterObject[],
          requestBody: operationObject.requestBody as OpenAPIV3.RequestBodyObject,
          responses: operationObject.responses as Record<string, OpenAPIV3.ResponseObject>
        });
      }
    }
    
    return operations;
  }
  
  /**
   * 获取模式定义
   */
  getSchemas(): Record<string, OpenAPIV3.SchemaObject> {
    if (!this.api || !this.api.components || !this.api.components.schemas) {
      return {};
    }
    
    return this.api.components.schemas as Record<string, OpenAPIV3.SchemaObject>;
  }
} 