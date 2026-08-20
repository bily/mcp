/**
 * 优化的Swagger/OpenAPI文档解析器
 * 支持缓存、懒加载和大型文档解析
 */
import { promises as fs } from 'fs';
import axios from 'axios';
import { OpenAPIV3 } from 'openapi-types';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as path from 'path';
import * as crypto from 'crypto';

// 定义解析器选项
export interface OptimizedSwaggerApiParserOptions {
  /**
   * Swagger/OpenAPI文档URL或本地文件路径
   */
  url: string;
  
  /**
   * 请求头信息
   */
  headers?: Record<string, string>;
  
  /**
   * 是否跳过验证
   */
  skipValidation?: boolean;
  
  /**
   * 是否使用缓存
   */
  useCache?: boolean;
  
  /**
   * 缓存有效期（毫秒）
   */
  cacheTTL?: number;
  
  /**
   * 是否启用懒加载
   */
  lazyLoading?: boolean;
  
  /**
   * 进度回调函数
   */
  progressCallback?: (progress: number, message: string) => void;
}

/**
 * API操作接口
 */
export interface ApiOperation {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses?: Record<string, OpenAPIV3.ResponseObject>;
}

/**
 * 缓存项目结构
 */
interface CacheItem {
  timestamp: number;
  data: any;
}

/**
 * 优化的Swagger API解析器类
 */
export class OptimizedSwaggerApiParser {
  private url: string;
  private headers: Record<string, string>;
  private options: OptimizedSwaggerApiParserOptions;
  private api?: OpenAPIV3.Document;
  private rawApiData?: any;
  private static cache: Map<string, CacheItem> = new Map();
  private static cacheDir = path.join(process.cwd(), '.api-cache');
  
  /**
   * 构造函数
   */
  constructor(options: OptimizedSwaggerApiParserOptions) {
    this.url = options.url;
    this.headers = options.headers || {};
    this.options = {
      skipValidation: false,
      useCache: true,
      cacheTTL: 3600000, // 默认缓存1小时
      lazyLoading: true,
      ...options
    };
    
    // 确保缓存目录存在
    if (this.options.useCache) {
      this.ensureCacheDir();
    }
  }
  
  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(OptimizedSwaggerApiParser.cacheDir, { recursive: true });
    } catch (error) {
      console.error('创建缓存目录失败:', error);
    }
  }
  
  /**
   * 生成缓存键
   */
  private getCacheKey(): string {
    const data = this.url + JSON.stringify(this.headers);
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  /**
   * 从缓存中获取数据
   */
  private async getFromCache(): Promise<any | null> {
    if (!this.options.useCache) return null;
    
    const cacheKey = this.getCacheKey();
    
    // 检查内存缓存
    if (OptimizedSwaggerApiParser.cache.has(cacheKey)) {
      const cachedItem = OptimizedSwaggerApiParser.cache.get(cacheKey)!;
      if (Date.now() - cachedItem.timestamp < this.options.cacheTTL!) {
        this.reportProgress(0.1, '从内存缓存加载数据');
        return cachedItem.data;
      }
    }
    
    // 检查文件缓存
    const cacheFilePath = path.join(OptimizedSwaggerApiParser.cacheDir, `${cacheKey}.json`);
    try {
      const stat = await fs.stat(cacheFilePath);
      if (Date.now() - stat.mtimeMs < this.options.cacheTTL!) {
        this.reportProgress(0.1, '从文件缓存加载数据');
        const content = await fs.readFile(cacheFilePath, 'utf8');
        const data = JSON.parse(content);
        
        // 更新内存缓存
        OptimizedSwaggerApiParser.cache.set(cacheKey, {
          timestamp: Date.now(),
          data
        });
        
        return data;
      }
    } catch (error) {
      // 缓存文件不存在或其他错误，忽略
    }
    
    return null;
  }
  
  /**
   * 将数据保存到缓存
   */
  private async saveToCache(data: any): Promise<void> {
    if (!this.options.useCache) return;
    
    const cacheKey = this.getCacheKey();
    
    // 更新内存缓存
    OptimizedSwaggerApiParser.cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
    
    // 更新文件缓存
    const cacheFilePath = path.join(OptimizedSwaggerApiParser.cacheDir, `${cacheKey}.json`);
    try {
      await fs.writeFile(cacheFilePath, JSON.stringify(data), 'utf8');
    } catch (error) {
      console.error('保存缓存文件失败:', error);
    }
  }
  
  /**
   * 清除缓存
   */
  public static clearCache(url?: string): void {
    if (url) {
      // 生成特定URL的缓存键
      const cacheKey = crypto.createHash('md5').update(url).digest('hex');
      // 清除内存缓存
      OptimizedSwaggerApiParser.cache.delete(cacheKey);
      // 清除文件缓存
      const cacheFilePath = path.join(OptimizedSwaggerApiParser.cacheDir, `${cacheKey}.json`);
      fs.unlink(cacheFilePath).catch(() => {});
    } else {
      // 清除所有内存缓存
      OptimizedSwaggerApiParser.cache.clear();
      // 清除所有文件缓存
      fs.readdir(OptimizedSwaggerApiParser.cacheDir)
        .then(files => {
          for (const file of files) {
            fs.unlink(path.join(OptimizedSwaggerApiParser.cacheDir, file)).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }
  
  /**
   * 报告进度
   */
  private reportProgress(progress: number, message: string): void {
    if (this.options.progressCallback) {
      this.options.progressCallback(progress, message);
    }
  }
  
  /**
   * 修复Swagger UI URL以获取实际API文档
   */
  private async resolveSwaggerDocUrl(url: string): Promise<string> {
    // 如果已经是API文档URL，则不需要处理
    if (url.includes('/api-docs') || url.includes('/swagger.json')) {
      return url;
    }
    
    // 处理常见的Swagger UI URL格式
    if (url.includes('doc.html') || 
        url.includes('swagger-ui.html') || 
        url.includes('swagger-ui/') || 
        url.includes('swagger/index.html')) {
      
      this.reportProgress(0.1, '检测到Swagger UI URL，尝试获取API文档地址');
      
      // 提取基础URL
      let baseUrl;
      if (url.includes('swagger-ui/')) {
        baseUrl = url.substring(0, url.indexOf('swagger-ui/'));
      } else if (url.includes('swagger/')) {
        baseUrl = url.substring(0, url.indexOf('swagger/'));
      } else {
        baseUrl = url.substring(0, url.lastIndexOf('/'));
      }
      
      // 移除URL中的hash部分
      if (baseUrl.includes('#')) {
        baseUrl = baseUrl.split('#')[0];
      }
      
      // 可能的API文档端点
      const possibleEndpoints = [
        `${baseUrl}/v3/api-docs`,
        `${baseUrl}/v2/api-docs`,
        `${baseUrl}/api-docs`,
        `${baseUrl}/swagger/v3/api-docs`,
        `${baseUrl}/swagger/v2/api-docs`,
        `${baseUrl}/swagger/api-docs`,
        url.replace('swagger-ui/index.html', 'v3/api-docs'),
        url.replace('swagger-ui.html', 'v3/api-docs'),
        url.replace('doc.html', 'v3/api-docs')
      ];
      
      // 尝试获取有效的API文档
      for (const endpoint of possibleEndpoints) {
        try {
          this.reportProgress(0.15, `尝试API端点: ${endpoint}`);
          const response = await axios.get(endpoint, { 
            headers: this.headers,
            timeout: 5000 // 5秒超时
          });
          
          // 验证是否是有效的Swagger/OpenAPI文档
          if (response.data && (
              response.data.swagger || 
              response.data.openapi || 
              (response.data.paths && Object.keys(response.data.paths).length > 0)
          )) {
            this.reportProgress(0.2, `找到有效的API文档: ${endpoint}`);
            return endpoint;
          }
        } catch (error) {
          // 忽略错误，继续尝试下一个端点
        }
      }
      
      // 如果没有找到有效的API文档，则返回原始URL
      this.reportProgress(0.2, '未找到有效的API文档，使用原始URL');
    }
    
    return url;
  }
  
  /**
   * 优化解析选项
   */
  private getParseOptions(): SwaggerParser.Options {
    return {
      validate: {
        schema: !this.options.skipValidation,
        spec: !this.options.skipValidation
      },
      dereference: {
        circular: 'ignore' as 'ignore'
      }
    };
  }
  
  /**
   * 获取API文档原始数据
   */
  private async fetchRawApiData(): Promise<any> {
    if (this.rawApiData) {
      return this.rawApiData;
    }
    
    // 尝试从缓存加载
    const cachedData = await this.getFromCache();
    if (cachedData) {
      this.rawApiData = cachedData;
      return this.rawApiData;
    }
    
    this.reportProgress(0.3, '开始获取API文档');
    
    // 解析Swagger UI URL以获取实际API文档URL
    const resolvedUrl = await this.resolveSwaggerDocUrl(this.url);
    
    // 获取API文档
    let apiData: any;
    if (resolvedUrl.startsWith('http')) {
      // 从URL获取
      try {
        const response = await axios.get(resolvedUrl, { 
          headers: this.headers,
          timeout: 30000, // 30秒超时
          maxContentLength: 50 * 1024 * 1024 // 50MB
        });
        apiData = response.data;
      } catch (error: any) {
        throw new Error(`获取API文档失败: ${error.message}`);
      }
    } else {
      // 从本地文件获取
      try {
        const content = await fs.readFile(resolvedUrl, 'utf8');
        apiData = JSON.parse(content);
      } catch (error: any) {
        throw new Error(`读取本地文件失败: ${error.message}`);
      }
    }
    
    this.reportProgress(0.5, 'API文档获取成功，保存到缓存');
    
    // 保存到缓存
    await this.saveToCache(apiData);
    
    this.rawApiData = apiData;
    return apiData;
  }
  
  /**
   * 轻量级解析API文档
   */
  private async parseApiLite(): Promise<OpenAPIV3.Document> {
    this.reportProgress(0.6, '开始轻量级解析API文档');
    
    const apiData = await this.fetchRawApiData();
    
    // 创建一个轻量级的文档对象，只包含基本信息和路径
    const liteDoc: any = {
      openapi: apiData.openapi || apiData.swagger || '3.0.0',
      info: apiData.info || { title: 'API', version: '1.0.0' },
      paths: apiData.paths || {},
      components: {
        schemas: {} // 不包含复杂的schema定义
      }
    };
    
    // 使用不严格的解析选项
    const parseOptions = this.getParseOptions();
    
    try {
      this.reportProgress(0.7, '正在解析基本API结构');
      // 使用parse而不是validate
      const result = await SwaggerParser.parse(liteDoc, parseOptions);
      return result as OpenAPIV3.Document;
    } catch (error: any) {
      throw new Error(`解析API文档失败: ${error.message}`);
    }
  }
  
  /**
   * 获取API文档
   */
  async fetchApi(forceRefresh: boolean = false): Promise<OpenAPIV3.Document> {
    // 如果已经解析过且不需要强制刷新，则直接返回
    if (this.api && !forceRefresh) {
      return this.api;
    }
    
    try {
      // 如果启用了懒加载，则使用轻量级解析
      if (this.options.lazyLoading) {
        this.api = await this.parseApiLite();
      } else {
        // 获取原始API数据
        const apiData = await this.fetchRawApiData();
        
        // 使用不严格的解析选项
        const parseOptions = this.getParseOptions();
        
        this.reportProgress(0.6, '开始完整解析API文档');
        
        // 解析API文档
        try {
          if (this.options.skipValidation) {
            const result = await SwaggerParser.parse(apiData, parseOptions);
            this.api = result as OpenAPIV3.Document;
          } else {
            try {
              // 尝试验证（如果失败则退回到parse）
              const result = await SwaggerParser.validate(apiData, parseOptions);
              this.api = result as OpenAPIV3.Document;
            } catch (error) {
              this.reportProgress(0.7, '验证失败，使用不严格解析');
              const result = await SwaggerParser.parse(apiData, parseOptions);
              this.api = result as OpenAPIV3.Document;
            }
          }
        } catch (error: any) {
          throw new Error(`解析API文档失败: ${error.message}`);
        }
      }
      
      this.reportProgress(1.0, 'API文档解析完成');
      return this.api;
    } catch (error: any) {
      this.reportProgress(1.0, `解析失败: ${error.message}`);
      throw new Error(`Failed to fetch API: ${error.message}`);
    }
  }
  
  /**
   * 按需获取模式定义
   */
  async getSchema(schemaName: string): Promise<OpenAPIV3.SchemaObject | undefined> {
    // 确保已经获取了API文档
    if (!this.api) {
      await this.fetchApi();
    }
    
    // 如果模式已经加载，则直接返回
    if (this.api?.components?.schemas?.[schemaName]) {
      return this.api.components.schemas[schemaName] as OpenAPIV3.SchemaObject;
    }
    
    // 如果未启用懒加载，则返回undefined
    if (!this.options.lazyLoading) {
      return undefined;
    }
    
    // 获取原始API数据
    const apiData = await this.fetchRawApiData();
    
    // 检查模式是否存在
    if (!apiData.components?.schemas?.[schemaName]) {
      return undefined;
    }
    
    // 解析单个模式
    try {
      const schemaDoc: any = {
        openapi: '3.0.0',
        info: { title: 'Schema', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            [schemaName]: apiData.components.schemas[schemaName]
          }
        }
      };
      
      const parseOptions = this.getParseOptions();
      const result = await SwaggerParser.parse(schemaDoc, parseOptions) as any;
      
      // 将解析后的模式添加到API文档中
      if (!this.api) {
        return result.components.schemas[schemaName] as OpenAPIV3.SchemaObject;
      }
      
      if (!this.api.components) {
        this.api.components = { schemas: {} };
      }
      
      if (!this.api.components.schemas) {
        this.api.components.schemas = {};
      }
      
      this.api.components.schemas[schemaName] = result.components.schemas[schemaName];
      
      return this.api.components.schemas[schemaName] as OpenAPIV3.SchemaObject;
    } catch (error) {
      console.error(`解析模式 ${schemaName} 失败:`, error);
      return undefined;
    }
  }
  
  /**
   * 获取所有模式定义
   */
  async getAllSchemas(): Promise<Record<string, OpenAPIV3.SchemaObject>> {
    // 确保已经获取了API文档
    if (!this.api) {
      await this.fetchApi();
    }
    
    // 如果已经加载了所有模式，则直接返回
    if (this.api?.components?.schemas && Object.keys(this.api.components.schemas).length > 0 && !this.options.lazyLoading) {
      return this.api.components.schemas as Record<string, OpenAPIV3.SchemaObject>;
    }
    
    // 获取原始API数据
    const apiData = await this.fetchRawApiData();
    
    // 如果没有模式，则返回空对象
    if (!apiData.components?.schemas) {
      return {};
    }
    
    // 解析所有模式
    try {
      const schemasDoc: any = {
        openapi: '3.0.0',
        info: { title: 'Schemas', version: '1.0.0' },
        paths: {},
        components: {
          schemas: apiData.components.schemas
        }
      };
      
      const parseOptions = this.getParseOptions();
      const result = await SwaggerParser.parse(schemasDoc, parseOptions) as any;
      
      // 将解析后的模式添加到API文档中
      if (!this.api) {
        return result.components.schemas as Record<string, OpenAPIV3.SchemaObject>;
      }
      
      if (!this.api.components) {
        this.api.components = { schemas: {} };
      }
      
      this.api.components.schemas = result.components.schemas;
      
      return this.api.components.schemas as Record<string, OpenAPIV3.SchemaObject>;
    } catch (error) {
      console.error(`解析所有模式失败:`, error);
      return {};
    }
  }
  
  /**
   * 获取所有API操作
   */
  async getAllOperations(): Promise<ApiOperation[]> {
    // 确保已经获取了API文档
    if (!this.api) {
      await this.fetchApi();
    }
    
    const operations: ApiOperation[] = [];
    
    // 遍历所有路径
    for (const [path, pathItem] of Object.entries(this.api?.paths || {})) {
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
   * 获取特定标签的API操作
   */
  async getOperationsByTag(tag: string): Promise<ApiOperation[]> {
    const operations = await this.getAllOperations();
    return operations.filter(op => op.tags?.includes(tag));
  }
  
  /**
   * 获取特定路径前缀的API操作
   */
  async getOperationsByPathPrefix(prefix: string): Promise<ApiOperation[]> {
    const operations = await this.getAllOperations();
    return operations.filter(op => op.path.startsWith(prefix));
  }
} 