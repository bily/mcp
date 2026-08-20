/**
 * API客户端代码生成器
 */
import { promises as fs } from 'fs';
import path from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { BaseCodeGenerator, CodeGenerationResult, CodeGeneratorOptions } from './code-generator';
import { OptimizedSwaggerApiParser } from '../optimized-swagger-parser';
import type { ApiOperation } from '../optimized-swagger-parser';

/**
 * API客户端生成器选项
 */
export interface ApiClientGeneratorOptions extends CodeGeneratorOptions {
  /**
   * Swagger/OpenAPI文档URL
   */
  swaggerUrl: string;
  
  /**
   * API客户端技术栈
   * @default "axios"
   */
  clientType?: 'axios' | 'fetch' | 'react-query';
  
  /**
   * 是否生成类型导入
   * @default true
   */
  generateTypeImports?: boolean;
  
  /**
   * 类型导入路径
   * @default "../types"
   */
  typesImportPath?: string;
  
  /**
   * 分组方式
   * @default "tag"
   */
  groupBy?: 'tag' | 'path' | 'none';
  
  /**
   * 请求头信息
   */
  headers?: Record<string, string>;
  
  /**
   * 过滤tag列表
   */
  includeTags?: string[];
  
  /**
   * 排除tag列表
   */
  excludeTags?: string[];
  
  /**
   * 自定义模板路径
   */
  templatePath?: string;

  /**
   * 是否使用缓存
   * @default true
   */
  useCache?: boolean;

  /**
   * 缓存有效期（分钟）
   * @default 60
   */
  cacheTTLMinutes?: number;

  /**
   * 是否跳过验证
   * @default false
   */
  skipValidation?: boolean;

  /**
   * 是否启用懒加载
   * @default true
   */
  lazyLoading?: boolean;

  /**
   * 进度回调函数
   */
  progressCallback?: (progress: number, message: string) => void;
}

/**
 * API客户端代码生成器类
 */
export class ApiClientGenerator extends BaseCodeGenerator<ApiClientGeneratorOptions> {
  constructor() {
    super(
      'api-client-generator',
      'Generates API client code from Swagger/OpenAPI specification'
    );
  }
  
  /**
   * 验证选项
   */
  validateOptions(options: ApiClientGeneratorOptions): boolean {
    if (!options.swaggerUrl) {
      return false;
    }
    
    if (options.clientType && !['axios', 'fetch', 'react-query'].includes(options.clientType)) {
      return false;
    }
    
    if (options.groupBy && !['tag', 'path', 'none'].includes(options.groupBy)) {
      return false;
    }
    
    if (options.includeTags && options.excludeTags) {
      console.warn('Both includeTags and excludeTags are defined. includeTags will take precedence.');
    }
    
    return true;
  }
  
  /**
   * 生成API客户端代码
   */
  async generate(options: ApiClientGeneratorOptions): Promise<CodeGenerationResult> {
    try {
      // 确保选项有效
      if (!this.validateOptions(options)) {
        return {
          files: [],
          success: false,
          error: 'Invalid options. swaggerUrl is required.'
        };
      }
      
      // 设置默认值
      const outputDir = options.outputDir || './generated/api';
      const overwrite = options.overwrite || false;
      const filePrefix = options.filePrefix || '';
      const fileSuffix = options.fileSuffix || '';
      const clientType = options.clientType || 'axios';
      const generateTypeImports = options.generateTypeImports !== false;
      const typesImportPath = options.typesImportPath || '../types';
      const groupBy = options.groupBy || 'tag';
      const useCache = options.useCache !== false;
      const cacheTTLMinutes = options.cacheTTLMinutes || 60;
      const skipValidation = options.skipValidation || false;
      const lazyLoading = options.lazyLoading !== false;
      
      // 创建输出目录
      await this.ensureDirectoryExists(outputDir);
      
      // 解析Swagger文档
      console.log(`[ApiClientGenerator] 解析Swagger文档: ${options.swaggerUrl}`);
      
      // 设置进度日志
      const logProgress = (progress: number, message: string) => {
        console.log(`[ApiClientGenerator] 进度 ${Math.round(progress * 100)}%: ${message}`);
        if (options.progressCallback) {
          options.progressCallback(progress, message);
        }
      };
      
      // 使用优化的解析器
      const parser = new OptimizedSwaggerApiParser({
        url: options.swaggerUrl,
        headers: options.headers,
        useCache,
        cacheTTL: cacheTTLMinutes * 60 * 1000, // 转换为毫秒
        skipValidation,
        lazyLoading,
        progressCallback: logProgress
      });
      
      logProgress(0.1, '开始获取API文档');
      const api = await parser.fetchApi();
      logProgress(0.3, 'API文档获取完成，开始获取操作列表');
      
      const operations = await parser.getAllOperations();
      
      if (!operations || operations.length === 0) {
        return {
          files: [],
          success: false,
          error: 'No API operations found in Swagger document'
        };
      }
      
      logProgress(0.4, `找到 ${operations.length} 个API操作，准备生成代码`);
      
      // 过滤操作
      const filteredOperations = this.filterOperations(operations, options.includeTags, options.excludeTags);
      logProgress(0.5, `过滤后剩余 ${filteredOperations.length} 个API操作`);
      
      // 分组操作
      const groupedOperations = this.groupOperations(filteredOperations, groupBy);
      
      // 生成客户端代码
      const generatedFiles: string[] = [];
      const warnings: string[] = [];
      
      // 获取所有用到的模式
      logProgress(0.6, '加载模式定义');
      const schemas = await parser.getAllSchemas();
      
      // 为每个分组生成文件
      let fileCount = 0;
      const totalGroups = Object.keys(groupedOperations).length;
      
      for (const [groupName, operations] of Object.entries(groupedOperations)) {
        try {
          // 格式化分组名称
          const formattedGroupName = this.formatGroupName(groupName);
          
          // 生成文件名
          const fileName = `${filePrefix}${formattedGroupName}${fileSuffix}.ts`;
          const filePath = path.join(outputDir, fileName);
          
          // 检查文件是否存在
          const fileExists = await this.fileExists(filePath);
          if (fileExists && !overwrite) {
            warnings.push(`跳过已存在的文件: ${fileName}`);
            continue;
          }
          
          // 生成客户端代码
          const clientCode = this.generateClientCode({
            groupName: formattedGroupName,
            operations,
            schemas,
            clientType,
            generateTypeImports,
            typesImportPath
          });
          
          // 写入文件
          await fs.writeFile(filePath, clientCode, 'utf8');
          generatedFiles.push(filePath);
          
          // 更新进度
          fileCount++;
          const progress = 0.6 + (0.3 * fileCount / totalGroups);
          logProgress(progress, `生成文件 ${fileCount}/${totalGroups}: ${fileName}`);
        } catch (err) {
          warnings.push(`无法处理分组 ${groupName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      
      // 生成索引文件
      if (generatedFiles.length > 0) {
        const indexContent = this.generateIndexFile(generatedFiles, outputDir);
        const indexPath = path.join(outputDir, 'index.ts');
        
        await fs.writeFile(indexPath, indexContent, 'utf8');
        generatedFiles.push(indexPath);
        
        logProgress(0.95, `已生成索引文件: ${indexPath}`);
      }
      
      // 生成基础客户端配置文件
      if (clientType === 'axios' || clientType === 'fetch') {
        const configFileName = `${clientType}-client.ts`;
        const configFilePath = path.join(outputDir, configFileName);
        
        if (!await this.fileExists(configFilePath) || overwrite) {
          const configCode = this.generateClientConfigCode(clientType);
          await fs.writeFile(configFilePath, configCode, 'utf8');
          generatedFiles.push(configFilePath);
          
          logProgress(0.98, `已生成客户端配置文件: ${configFilePath}`);
        }
      }
      
      logProgress(1.0, `代码生成完成，共生成 ${generatedFiles.length} 个文件`);
      
      return {
        files: generatedFiles,
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        files: [],
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 过滤API操作
   */
  private filterOperations(
    operations: ApiOperation[], 
    includeTags?: string[], 
    excludeTags?: string[]
  ): ApiOperation[] {
    if (includeTags && includeTags.length > 0) {
      // 只包含指定tag的操作
      return operations.filter(op => 
        op.tags && op.tags.some((tag: string) => includeTags.includes(tag))
      );
    } else if (excludeTags && excludeTags.length > 0) {
      // 排除指定tag的操作
      return operations.filter(op => 
        !op.tags || !op.tags.some((tag: string) => excludeTags.includes(tag))
      );
    }
    
    return operations;
  }
  
  /**
   * 分组API操作
   */
  private groupOperations(
    operations: ApiOperation[], 
    groupBy: 'tag' | 'path' | 'none'
  ): Record<string, ApiOperation[]> {
    const grouped: Record<string, ApiOperation[]> = {};
    
    if (groupBy === 'none') {
      grouped['api'] = operations;
      return grouped;
    }
    
    for (const operation of operations) {
      let groupNames: string[] = [];
      
      if (groupBy === 'tag') {
        // 按tag分组
        groupNames = operation.tags && operation.tags.length > 0 
          ? operation.tags 
          : ['default'];
      } else if (groupBy === 'path') {
        // 按路径第一级分组
        const pathParts = operation.path.split('/').filter(Boolean);
        const firstPath = pathParts.length > 0 ? pathParts[0] : 'default';
        groupNames = [firstPath];
      }
      
      // 添加到所有相关分组
      for (const name of groupNames) {
        if (!grouped[name]) {
          grouped[name] = [];
        }
        grouped[name].push(operation);
      }
    }
    
    return grouped;
  }
  
  /**
   * 格式化分组名称
   */
  private formatGroupName(name: string): string {
    // 移除非法字符
    let formattedName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // 转换为驼峰命名
    formattedName = formattedName
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^([A-Z])/, (_, letter) => letter.toLowerCase());
    
    // 确保名称不以数字开头
    if (/^[0-9]/.test(formattedName)) {
      formattedName = 'api' + formattedName;
    }
    
    return formattedName;
  }
  
  /**
   * 生成索引文件
   */
  private generateIndexFile(files: string[], baseDir: string): string {
    const imports: string[] = [];
    
    for (const file of files) {
      // 排除索引文件本身和客户端配置文件
      const basename = path.basename(file);
      if (basename === 'index.ts' || basename.endsWith('-client.ts')) {
        continue;
      }
      
      // 获取相对路径
      const relativePath = path.relative(baseDir, file);
      // 移除.ts扩展名
      const importPath = './' + relativePath.replace(/\.ts$/, '');
      
      imports.push(`export * from '${importPath}';`);
    }
    
    // 导出客户端配置
    imports.push(`export * from './axios-client';`);
    
    return imports.join('\n') + '\n';
  }
  
  /**
   * 生成客户端代码
   */
  private generateClientCode(options: {
    groupName: string;
    operations: ApiOperation[];
    schemas: Record<string, OpenAPIV3.SchemaObject>;
    clientType: 'axios' | 'fetch' | 'react-query';
    generateTypeImports: boolean;
    typesImportPath: string;
  }): string {
    const { groupName, operations, schemas, clientType, generateTypeImports, typesImportPath } = options;
    
    // 收集使用到的类型
    const usedTypes = new Set<string>();
    
    // 生成导入语句
    let imports = '';
    
    if (clientType === 'axios') {
      imports += `import { axiosInstance } from './axios-client';\n\n`;
    } else if (clientType === 'fetch') {
      imports += `import { fetchWithConfig } from './fetch-client';\n\n`;
    } else if (clientType === 'react-query') {
      imports += `import { useQuery, useMutation } from '@tanstack/react-query';\n`;
      imports += `import { axiosInstance } from './axios-client';\n\n`;
    }
    
    // 分析操作，收集使用到的类型
    for (const operation of operations) {
      this.collectTypes(operation, schemas, usedTypes);
    }
    
    // 生成类型导入
    if (generateTypeImports && usedTypes.size > 0) {
      const typeImports = Array.from(usedTypes).join(', ');
      imports += `import { ${typeImports} } from '${typesImportPath}';\n\n`;
    }
    
    // 生成API函数
    const apiFunctions = operations.map(operation => 
      this.generateApiFunction(operation, clientType)
    ).join('\n\n');
    
    return `${imports}${apiFunctions}\n`;
  }
  
  /**
   * 收集使用到的类型
   */
  private collectTypes(
    operation: ApiOperation, 
    schemas: Record<string, OpenAPIV3.SchemaObject>,
    usedTypes: Set<string>
  ): void {
    // 检查参数类型
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if ('schema' in param) {
          this.collectSchemaTypes(param.schema as OpenAPIV3.SchemaObject | undefined, schemas, usedTypes);
        }
      }
    }
    
    // 检查请求体类型
    if (operation.requestBody?.content) {
      for (const [_, mediaType] of Object.entries(operation.requestBody.content)) {
        this.collectSchemaTypes((mediaType as any).schema as OpenAPIV3.SchemaObject | undefined, schemas, usedTypes);
      }
    }
    
    // 检查响应类型
    if (operation.responses) {
      for (const [_, response] of Object.entries(operation.responses)) {
        if ((response as any).content) {
          for (const [__, mediaType] of Object.entries((response as any).content)) {
            this.collectSchemaTypes((mediaType as any).schema, schemas, usedTypes);
          }
        }
      }
    }
  }
  
  /**
   * 从模式中收集类型
   */
  private collectSchemaTypes(
    schema: OpenAPIV3.SchemaObject | undefined,
    schemas: Record<string, OpenAPIV3.SchemaObject>,
    usedTypes: Set<string>
  ): void {
    if (!schema) return;
    
    // 处理引用
    if ('$ref' in schema && typeof schema.$ref === 'string') {
      const refParts = schema.$ref.split('/');
      const refName = refParts[refParts.length - 1];
      usedTypes.add(refName);
      
      // 递归处理引用的模式
      if (schemas[refName]) {
        this.collectSchemaTypes(schemas[refName], schemas, usedTypes);
      }
    }
    
    // 处理数组
    if (schema.type === 'array' && schema.items) {
      this.collectSchemaTypes(schema.items as OpenAPIV3.SchemaObject, schemas, usedTypes);
    }
    
    // 处理对象属性
    if (schema.properties) {
      for (const [_, propSchema] of Object.entries(schema.properties)) {
        this.collectSchemaTypes(propSchema as OpenAPIV3.SchemaObject, schemas, usedTypes);
      }
    }
    
    // 处理联合类型
    if (schema.oneOf || schema.anyOf) {
      const subSchemas = schema.oneOf || schema.anyOf || [];
      for (const subSchema of subSchemas) {
        this.collectSchemaTypes(subSchema as OpenAPIV3.SchemaObject, schemas, usedTypes);
      }
    }
    
    // 处理交叉类型
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        this.collectSchemaTypes(subSchema as OpenAPIV3.SchemaObject, schemas, usedTypes);
      }
    }
  }
  
  /**
   * 生成API函数
   */
  private generateApiFunction(
    operation: ApiOperation,
    clientType: 'axios' | 'fetch' | 'react-query'
  ): string {
    const { operationId, method, path, summary, description, parameters, requestBody, responses } = operation;
    
    // 生成函数名
    const functionName = this.formatOperationId(operationId);
    
    // 生成注释
    const comments = [];
    if (summary) comments.push(summary);
    if (description) comments.push(description);
    
    // 生成路径参数映射
    const pathParams = parameters?.filter((p: OpenAPIV3.ParameterObject) => (p as any).in === 'path') || [];
    
    // 生成查询参数映射
    const queryParams = parameters?.filter((p: OpenAPIV3.ParameterObject) => (p as any).in === 'query') || [];
    
    // 生成其他参数
    const headerParams = parameters?.filter((p: OpenAPIV3.ParameterObject) => (p as any).in === 'header') || [];
    
    // 处理请求体类型
    let requestBodyType = 'any';
    let requestBodyRequired = requestBody?.required || false;
    if (requestBody?.content) {
      const contentType = Object.keys(requestBody.content)[0];
      if (contentType) {
        const schema = (requestBody.content[contentType] as any).schema;
        if (schema) {
          if (schema.$ref) {
            const refParts = schema.$ref.split('/');
            requestBodyType = refParts[refParts.length - 1];
          } else if (schema.type === 'array') {
            requestBodyType = 'any[]';
          } else {
            requestBodyType = this.mapSwaggerTypeToTS(schema);
          }
        }
      }
    }
    
    // 处理响应类型
    let responseType = 'any';
    const successResponse = responses?.['200'] || responses?.['201'] || responses?.['204'];
    if (successResponse && (successResponse as any).content) {
      const contentType = Object.keys((successResponse as any).content)[0];
      if (contentType) {
        const schema = (successResponse as any).content[contentType].schema;
        if (schema) {
          if (schema.$ref) {
            const refParts = schema.$ref.split('/');
            responseType = refParts[refParts.length - 1];
          } else if (schema.type === 'array') {
            let itemType = 'any';
            if (schema.items) {
              const itemSchema = schema.items as OpenAPIV3.SchemaObject;
              if ('$ref' in itemSchema && typeof itemSchema.$ref === 'string') {
                const refParts = itemSchema.$ref.split('/');
                itemType = refParts[refParts.length - 1];
              } else {
                itemType = this.mapSwaggerTypeToTS(itemSchema);
              }
            }
            responseType = `${itemType}[]`;
          } else {
            responseType = this.mapSwaggerTypeToTS(schema);
          }
        }
      }
    }
    
    // 生成参数接口
    const paramInterfaceName = `${this.capitalize(functionName)}Params`;
    let paramInterface = `interface ${paramInterfaceName} {\n`;
    
    // 添加路径参数
    for (const param of pathParams) {
      const paramType = this.getParamType(param);
      paramInterface += `  /** ${(param as any).description || (param as any).name} */\n`;
      paramInterface += `  ${(param as any).name}: ${paramType};\n`;
    }
    
    // 添加查询参数
    if (queryParams.length > 0) {
      paramInterface += `  /** 查询参数 */\n`;
      paramInterface += `  queryParams?: {\n`;
      for (const param of queryParams) {
        const paramType = this.getParamType(param);
        const isRequired = (param as any).required ? '' : '?';
        paramInterface += `    /** ${(param as any).description || (param as any).name} */\n`;
        paramInterface += `    ${(param as any).name}${isRequired}: ${paramType};\n`;
      }
      paramInterface += `  };\n`;
    }
    
    // 添加请求体
    if (requestBody) {
      paramInterface += `  /** 请求数据 */\n`;
      paramInterface += `  data${requestBodyRequired ? '' : '?'}: ${requestBodyType};\n`;
    }
    
    // 添加头部参数
    if (headerParams.length > 0) {
      paramInterface += `  /** 头部参数 */\n`;
      paramInterface += `  headers?: {\n`;
      for (const param of headerParams) {
        const paramType = this.getParamType(param);
        const isRequired = (param as any).required ? '' : '?';
        paramInterface += `    /** ${(param as any).description || (param as any).name} */\n`;
        paramInterface += `    ${(param as any).name}${isRequired}: ${paramType};\n`;
      }
      paramInterface += `  };\n`;
    }
    
    paramInterface += `}\n\n`;
    
    // 生成注释文档
    let commentDoc = '/**\n';
    for (const comment of comments) {
      commentDoc += ` * ${comment}\n`;
    }
    commentDoc += ` * @param params 请求参数\n`;
    commentDoc += ` * @returns ${responseType} 响应结果\n`;
    commentDoc += ` */\n`;
    
    // 根据不同的客户端类型生成不同的API函数
    if (clientType === 'axios') {
      return this.generateAxiosFunction(
        functionName,
        method,
        path,
        paramInterfaceName,
        responseType,
        paramInterface,
        commentDoc
      );
    } else if (clientType === 'fetch') {
      return this.generateFetchFunction(
        functionName,
        method,
        path,
        paramInterfaceName,
        responseType,
        paramInterface,
        commentDoc
      );
    } else if (clientType === 'react-query') {
      return this.generateReactQueryFunction(
        functionName,
        method,
        path,
        paramInterfaceName,
        responseType,
        paramInterface,
        commentDoc
      );
    }
    
    return '';
  }
  
  /**
   * 生成Axios API函数
   */
  private generateAxiosFunction(
    functionName: string,
    method: string,
    path: string,
    paramInterfaceName: string,
    responseType: string,
    paramInterface: string,
    commentDoc: string
  ): string {
    // 构建URL模板
    const urlTemplate = this.generateUrlTemplate(path);
    
    // 构建函数体
    const functionBody = `
${paramInterface}${commentDoc}export async function ${functionName}(params: ${paramInterfaceName}): Promise<${responseType}> {
  // 替换URL中的路径参数
  let url = \`${urlTemplate}\`;
  
  // 设置请求配置
  const config: any = {
    method: '${method.toUpperCase()}',
    url,
  };
  
  // 设置查询参数
  if (params.queryParams) {
    config.params = params.queryParams;
  }
  
  // 设置请求体
  if (params.data) {
    config.data = params.data;
  }
  
  // 设置头部参数
  if (params.headers) {
    config.headers = params.headers;
  }
  
  // 发送请求
  const response = await axiosInstance(config);
  return response.data;
}
`;
    
    return functionBody.trim();
  }
  
  /**
   * 生成Fetch API函数
   */
  private generateFetchFunction(
    functionName: string,
    method: string,
    path: string,
    paramInterfaceName: string,
    responseType: string,
    paramInterface: string,
    commentDoc: string
  ): string {
    // 构建URL模板
    const urlTemplate = this.generateUrlTemplate(path);
    
    // 构建函数体
    const functionBody = `
${paramInterface}${commentDoc}export async function ${functionName}(params: ${paramInterfaceName}): Promise<${responseType}> {
  // 替换URL中的路径参数
  let url = \`${urlTemplate}\`;
  
  // 构建查询参数
  if (params.queryParams) {
    const queryString = new URLSearchParams(
      Object.entries(params.queryParams)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    if (queryString) {
      url += \`?\${queryString}\`;
    }
  }
  
  // 设置请求选项
  const options: RequestInit = {
    method: '${method.toUpperCase()}',
  };
  
  // 设置请求体
  if (params.data) {
    options.body = JSON.stringify(params.data);
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
  }
  
  // 设置头部参数
  if (params.headers) {
    options.headers = {
      ...options.headers,
      ...params.headers,
    };
  }
  
  // 发送请求
  const response = await fetchWithConfig(url, options);
  return response.json();
}
`;
    
    return functionBody.trim();
  }
  
  /**
   * 生成React Query函数
   */
  private generateReactQueryFunction(
    functionName: string,
    method: string,
    path: string,
    paramInterfaceName: string,
    responseType: string,
    paramInterface: string,
    commentDoc: string
  ): string {
    // 构建URL模板
    const urlTemplate = this.generateUrlTemplate(path);
    
    // 判断是否是查询方法
    const isQuery = ['get'].includes(method.toLowerCase());
    
    let functionBody = `${paramInterface}`;
    
    // 首先生成基础API函数
    functionBody += `${commentDoc}export async function ${functionName}Raw(params: ${paramInterfaceName}): Promise<${responseType}> {
  // 替换URL中的路径参数
  let url = \`${urlTemplate}\`;
  
  // 设置请求配置
  const config: any = {
    method: '${method.toUpperCase()}',
    url,
  };
  
  // 设置查询参数
  if (params.queryParams) {
    config.params = params.queryParams;
  }
  
  // 设置请求体
  if (params.data) {
    config.data = params.data;
  }
  
  // 设置头部参数
  if (params.headers) {
    config.headers = params.headers;
  }
  
  // 发送请求
  const response = await axiosInstance(config);
  return response.data;
}\n\n`;
    
    // 然后根据HTTP方法生成React Query钩子
    if (isQuery) {
      // 为GET请求生成useQuery钩子
      functionBody += `/**
 * 使用React Query的${functionName}查询钩子
 * @param params 请求参数
 * @param options React Query选项
 */
export function use${this.capitalize(functionName)}(
  params: ${paramInterfaceName},
  options?: UseQueryOptions<${responseType}, Error>
) {
  return useQuery<${responseType}, Error>(
    // 查询键，用于缓存和依赖更新
    ['${functionName}', params],
    // 查询函数
    () => ${functionName}Raw(params),
    // 附加选项
    options
  );
}\n`;
    } else {
      // 为非GET请求生成useMutation钩子
      functionBody += `/**
 * 使用React Query的${functionName}变更钩子
 * @param options React Query选项
 */
export function use${this.capitalize(functionName)}(
  options?: UseMutationOptions<${responseType}, Error, ${paramInterfaceName}>
) {
  return useMutation<${responseType}, Error, ${paramInterfaceName}>(
    // 变更函数
    (params) => ${functionName}Raw(params),
    // 附加选项
    options
  );
}\n`;
    }
    
    return functionBody.trim();
  }
  
  /**
   * 生成URL模板，将路径参数替换为模板变量
   */
  private generateUrlTemplate(path: string): string {
    // 替换路径参数，从{paramName}格式转换为ES6模板字符串${params.paramName}
    return path.replace(/{([^}]+)}/g, '${params.$1}');
  }
  
  /**
   * 获取参数类型
   */
  private getParamType(param: any): string {
    if (!param.schema) return 'any';
    
    const schema = param.schema;
    
    // 处理引用
    if (schema.$ref) {
      const refParts = schema.$ref.split('/');
      return refParts[refParts.length - 1];
    }
    
    return this.mapSwaggerTypeToTS(schema);
  }
  
  /**
   * 映射Swagger类型到TypeScript类型
   */
  private mapSwaggerTypeToTS(schema: OpenAPIV3.SchemaObject): string {
    switch (schema.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'string':
        if (schema.format === 'date' || schema.format === 'date-time') {
          return 'string';  // 或者可以使用 'Date'
        }
        return 'string';
      case 'array':
        if (schema.items) {
          const itemSchema = schema.items as OpenAPIV3.SchemaObject;
          return `${this.mapSwaggerTypeToTS(itemSchema)}[]`;
        }
        return 'any[]';
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties).map(([key, prop]) => {
            const isRequired = schema.required?.includes(key) ? '' : '?';
            return `${key}${isRequired}: ${this.mapSwaggerTypeToTS(prop as OpenAPIV3.SchemaObject)}`;
          });
          return `{ ${props.join('; ')} }`;
        }
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }
  
  /**
   * 格式化操作ID
   */
  private formatOperationId(operationId: string): string {
    // 移除空格和特殊字符
    let formatted = operationId.replace(/[^a-zA-Z0-9]/g, ' ');
    
    // 转换为驼峰命名
    formatted = formatted
      .split(' ')
      .filter(Boolean)
      .map((word, index) => 
        index === 0 
          ? word.toLowerCase() 
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
    
    return formatted;
  }
  
  /**
   * 首字母大写
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * 生成客户端配置代码
   */
  private generateClientConfigCode(clientType: 'axios' | 'fetch'): string {
    if (clientType === 'axios') {
      return `import axios from 'axios';

/**
 * 全局Axios实例配置
 */
export const axiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * 请求拦截器
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // 在发送请求前做些什么
    // 例如，添加身份验证令牌
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = \`Bearer \${token}\`;
    // }
    return config;
  },
  (error) => {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // 对响应数据做些什么
    return response;
  },
  (error) => {
    // 对响应错误做些什么
    // 例如，处理401未授权错误
    // if (error.response && error.response.status === 401) {
    //   // 重定向到登录页面或刷新令牌
    // }
    return Promise.reject(error);
  }
);`;
    } else if (clientType === 'fetch') {
      return `/**
 * 全局Fetch配置
 */
const defaultConfig: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'same-origin',
};

/**
 * 扩展的Fetch函数，包含默认配置和错误处理
 */
export async function fetchWithConfig(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // 合并配置
  const config = {
    ...defaultConfig,
    ...options,
    headers: {
      ...defaultConfig.headers,
      ...options?.headers,
    },
  };
  
  // 添加身份验证令牌
  // const token = localStorage.getItem('token');
  // if (token) {
  //   config.headers.Authorization = \`Bearer \${token}\`;
  // }
  
  // 添加基础URL
  const baseUrl = process.env.API_BASE_URL || '';
  const fullUrl = url.startsWith('http') ? url : \`\${baseUrl}\${url}\`;
  
  // 发送请求
  const response = await fetch(fullUrl, config);
  
  // 检查响应状态
  if (!response.ok) {
    // 处理HTTP错误
    const error = await response.text();
    throw new Error(\`HTTP error \${response.status}: \${error}\`);
  }
  
  return response;
}`;
    }
    
    return '';
  }
} 