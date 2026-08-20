/**
 * TypeScript类型定义生成器
 */
import { promises as fs } from 'fs';
import path from 'path';
import { OpenAPIV3 } from 'openapi-types';
import { BaseCodeGenerator, CodeGenerationResult, CodeGeneratorOptions } from './code-generator';
import { OptimizedSwaggerApiParser } from '../optimized-swagger-parser';

/**
 * TypeScript类型生成器选项
 */
export interface TypeScriptTypesGeneratorOptions extends CodeGeneratorOptions {
  /**
   * Swagger/OpenAPI文档URL
   */
  swaggerUrl: string;
  
  /**
   * 使用命名空间包装类型
   */
  useNamespace?: boolean;
  
  /**
   * 命名空间名称
   */
  namespace?: string;
  
  /**
   * 是否生成枚举类型
   */
  generateEnums?: boolean;
  
  /**
   * 是否使用严格类型
   */
  strictTypes?: boolean;
  
  /**
   * 自定义类型映射
   */
  typeMapping?: Record<string, string>;
  
  /**
   * 排除的模式名称数组
   */
  excludeSchemas?: string[];
  
  /**
   * 包含的模式名称数组
   */
  includeSchemas?: string[];
  
  /**
   * 是否生成索引文件
   */
  generateIndex?: boolean;
  
  /**
   * 请求头信息
   */
  headers?: Record<string, string>;

  /**
   * 是否使用缓存
   */
  useCache?: boolean;
  
  /**
   * 缓存有效期（分钟）
   */
  cacheTTLMinutes?: number;
  
  /**
   * 是否跳过验证
   */
  skipValidation?: boolean;

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
 * TypeScript类型生成器
 */
export class TypeScriptTypesGenerator extends BaseCodeGenerator<TypeScriptTypesGeneratorOptions> {
  constructor() {
    super(
      'typescript-types-generator',
      'Generates TypeScript type definitions from Swagger/OpenAPI schemas'
    );
  }
  
  /**
   * 验证选项
   */
  validateOptions(options: TypeScriptTypesGeneratorOptions): boolean {
    if (!options.swaggerUrl) {
      return false;
    }
    
    if (options.includeSchemas && options.excludeSchemas) {
      console.warn('Both includeSchemas and excludeSchemas are defined. includeSchemas will take precedence.');
    }
    
    return true;
  }
  
  /**
   * 生成TypeScript类型定义
   */
  async generate(options: TypeScriptTypesGeneratorOptions): Promise<CodeGenerationResult> {
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
      const outputDir = options.outputDir || './generated';
      const overwrite = options.overwrite || false;
      const filePrefix = options.filePrefix || '';
      const fileSuffix = options.fileSuffix || '';
      const useNamespace = options.useNamespace || false;
      const namespace = options.namespace || 'API';
      const generateEnums = options.generateEnums !== false;
      const strictTypes = options.strictTypes || true;
      const generateIndex = options.generateIndex !== false;
      const useCache = options.useCache !== false;
      const skipValidation = options.skipValidation !== false;
      const lazyLoading = options.lazyLoading || false;
      const cacheTTLMinutes = options.cacheTTLMinutes || 60;
      
      // 创建输出目录
      await this.ensureDirectoryExists(outputDir);
      
      // 定义进度回调
      const progressCallback = options.progressCallback || ((progress: number, message: string) => {
        console.log(`[TypeScriptTypesGenerator] 进度: ${Math.round(progress * 100)}%, ${message}`);
      });
      
      // 解析Swagger文档
      console.log(`[TypeScriptTypesGenerator] 解析Swagger文档: ${options.swaggerUrl}`);
      
      // 使用优化的Swagger解析器
      const parser = new OptimizedSwaggerApiParser({
        url: options.swaggerUrl,
        headers: options.headers,
        skipValidation,
        useCache,
        cacheTTL: cacheTTLMinutes * 60 * 1000,
        lazyLoading,
        progressCallback
      });
      
      // 获取API文档
      const api = await parser.fetchApi();
      
      // 获取模式定义
      const schemas = await parser.getAllSchemas();
      
      if (!schemas || Object.keys(schemas).length === 0) {
        return {
          files: [],
          success: false,
          error: 'No schemas found in Swagger document'
        };
      }
      
      console.log(`[TypeScriptTypesGenerator] 找到 ${Object.keys(schemas).length} 个模式定义`);
      
      // 过滤模式
      const filteredSchemas = this.filterSchemas(schemas, options.includeSchemas, options.excludeSchemas);
      console.log(`[TypeScriptTypesGenerator] 过滤后剩余 ${Object.keys(filteredSchemas).length} 个模式定义`);
      
      // 生成类型定义
      const generatedFiles: string[] = [];
      const warnings: string[] = [];
      
      // 处理每个模式
      for (const [schemaName, schema] of Object.entries(filteredSchemas)) {
        try {
          // 转换为TypeScript类型
          const typeDefinition = this.convertSchemaToTypeScript(schemaName, schema, {
            schemas: filteredSchemas,
            useNamespace,
            namespace,
            generateEnums,
            strictTypes,
            typeMapping: options.typeMapping
          });
          
          // 生成文件名
          const fileName = `${filePrefix}${this.formatSchemaNameToFileName(schemaName)}${fileSuffix}.ts`;
          const filePath = path.join(outputDir, fileName);
          
          // 检查文件是否存在
          const fileExists = await this.fileExists(filePath);
          if (fileExists && !overwrite) {
            warnings.push(`跳过已存在的文件: ${fileName}`);
            continue;
          }
          
          // 写入文件
          await fs.writeFile(filePath, typeDefinition, 'utf8');
          generatedFiles.push(filePath);
          
          console.log(`[TypeScriptTypesGenerator] 已生成: ${filePath}`);
        } catch (err) {
          warnings.push(`无法处理模式 ${schemaName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      
      // 生成索引文件
      if (generateIndex && generatedFiles.length > 0) {
        const indexContent = this.generateIndexFile(generatedFiles, outputDir);
        const indexPath = path.join(outputDir, 'index.ts');
        
        await fs.writeFile(indexPath, indexContent, 'utf8');
        generatedFiles.push(indexPath);
        
        console.log(`[TypeScriptTypesGenerator] 已生成索引文件: ${indexPath}`);
      }
      
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
   * 过滤模式
   */
  private filterSchemas(
    schemas: Record<string, OpenAPIV3.SchemaObject>, 
    includeSchemas?: string[], 
    excludeSchemas?: string[]
  ): Record<string, OpenAPIV3.SchemaObject> {
    if (includeSchemas && includeSchemas.length > 0) {
      // 只包含指定的模式
      const result: Record<string, OpenAPIV3.SchemaObject> = {};
      for (const schemaName of includeSchemas) {
        if (schemas[schemaName]) {
          result[schemaName] = schemas[schemaName];
        }
      }
      return result;
    } else if (excludeSchemas && excludeSchemas.length > 0) {
      // 排除指定的模式
      const result: Record<string, OpenAPIV3.SchemaObject> = { ...schemas };
      for (const schemaName of excludeSchemas) {
        delete result[schemaName];
      }
      return result;
    }
    
    return schemas;
  }
  
  /**
   * 将模式名称格式化为文件名
   */
  private formatSchemaNameToFileName(schemaName: string): string {
    // 移除非法字符
    let fileName = schemaName.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // 转换为短横线命名法
    fileName = fileName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    
    return fileName;
  }
  
  /**
   * 生成索引文件
   */
  private generateIndexFile(files: string[], baseDir: string): string {
    const imports: string[] = [];
    
    for (const file of files) {
      // 排除索引文件本身
      if (path.basename(file) === 'index.ts') continue;
      
      // 获取相对路径
      const relativePath = path.relative(baseDir, file);
      // 移除.ts扩展名
      const importPath = './' + relativePath.replace(/\.ts$/, '');
      // 获取文件名作为导出名称
      const exportName = path.basename(file, '.ts');
      
      imports.push(`export * from '${importPath}';`);
    }
    
    return imports.join('\n') + '\n';
  }
  
  /**
   * 将Swagger模式转换为TypeScript类型定义
   */
  private convertSchemaToTypeScript(
    schemaName: string, 
    schema: OpenAPIV3.SchemaObject,
    options: {
      schemas: Record<string, OpenAPIV3.SchemaObject>;
      useNamespace: boolean;
      namespace: string;
      generateEnums: boolean;
      strictTypes: boolean;
      typeMapping?: Record<string, string>;
    }
  ): string {
    const { useNamespace, namespace, generateEnums, strictTypes, typeMapping } = options;
    
    // 处理注释
    const comments = [];
    if (schema.description) {
      comments.push(` * ${schema.description.replace(/\\n/g, '\\n * ')}`);
    }
    
    if (schema.deprecated) {
      comments.push(' * @deprecated');
    }
    
    const commentBlock = comments.length > 0 
      ? `/**\n${comments.join('\n')}\n */\n` 
      : '';
    
    // 处理不同类型的模式
    let typeDefinition = '';
    
    // 处理枚举
    if (schema.enum && generateEnums) {
      typeDefinition = this.generateEnumDefinition(schemaName, schema);
    } 
    // 处理对象
    else if (schema.type === 'object' || schema.properties) {
      typeDefinition = this.generateInterfaceDefinition(schemaName, schema, options);
    } 
    // 处理数组
    else if (schema.type === 'array' && schema.items) {
      const itemsType = this.getTypeFromSchema(
        schema.items as OpenAPIV3.SchemaObject, 
        `${schemaName}Item`, 
        options
      );
      typeDefinition = `export type ${schemaName} = ${itemsType}[];`;
    } 
    // 处理基本类型
    else {
      const type = this.getTypeFromSchema(schema, schemaName, options);
      typeDefinition = `export type ${schemaName} = ${type};`;
    }
    
    // 包装命名空间
    if (useNamespace) {
      return `${commentBlock}export namespace ${namespace} {\n  ${typeDefinition.replace(/\\n/g, '\\n  ')}\n}\n`;
    }
    
    return `${commentBlock}${typeDefinition}\n`;
  }
  
  /**
   * 生成枚举定义
   */
  private generateEnumDefinition(
    enumName: string, 
    schema: OpenAPIV3.SchemaObject
  ): string {
    if (!schema.enum || schema.enum.length === 0) {
      return `export type ${enumName} = any;`;
    }
    
    // 确定枚举值的类型
    const enumType = typeof schema.enum[0];
    
    // 使用字符串联合类型或数字联合类型
    if (enumType === 'string' || enumType === 'number') {
      const enumValues = schema.enum
        .map(value => typeof value === 'string' ? `'${value}'` : value)
        .join(' | ');
      
      return `export type ${enumName} = ${enumValues};`;
    } 
    // 使用实际的enum关键字
    else {
      const enumValues = schema.enum
        .map((value, index) => {
          const key = typeof value === 'string' 
            ? value.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase() 
            : `VALUE_${index}`;
          
          return `  ${key} = ${typeof value === 'string' ? `'${value}'` : value}`;
        })
        .join(',');
      
      return `export enum ${enumName} {\n${enumValues}\n}`;
    }
  }
  
  /**
   * 生成接口定义
   */
  private generateInterfaceDefinition(
    interfaceName: string, 
    schema: OpenAPIV3.SchemaObject,
    options: {
      schemas: Record<string, OpenAPIV3.SchemaObject>;
      useNamespace: boolean;
      namespace: string;
      generateEnums: boolean;
      strictTypes: boolean;
      typeMapping?: Record<string, string>;
    }
  ): string {
    const { strictTypes } = options;
    
    // 处理无属性的情况
    if (!schema.properties && !schema.additionalProperties) {
      return `export type ${interfaceName} = Record<string, any>;`;
    }
    
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    // 处理属性
    const propertyDefinitions = Object.entries(properties).map(([propName, propSchema]) => {
      // 属性注释
      const propComment = 'description' in (propSchema as any)
        ? `  /**\n   * ${(propSchema as any).description}\n   */\n`
        : '';
      
      // 判断属性是否必需
      const isRequired = required.includes(propName);
      const questionMark = isRequired || !strictTypes ? '' : '?';
      
      // 获取属性类型
      const propType = this.getTypeFromSchema(
        propSchema as OpenAPIV3.SchemaObject, 
        `${interfaceName}${this.capitalizeFirstLetter(propName)}`, 
        options
      );
      
      return `${propComment}  ${propName}${questionMark}: ${propType};`;
    });
    
    // 处理additionalProperties
    let additionalProps = '';
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === 'boolean') {
        if (schema.additionalProperties) {
          additionalProps = `  [key: string]: any;`;
        }
      } else {
        const additionalPropType = this.getTypeFromSchema(
          schema.additionalProperties as OpenAPIV3.SchemaObject, 
          `${interfaceName}AdditionalProperty`, 
          options
        );
        additionalProps = `  [key: string]: ${additionalPropType};`;
      }
    }
    
    // 组合接口定义
    const propsText = [...propertyDefinitions, additionalProps].filter(Boolean).join('\n');
    
    return `export interface ${interfaceName} {\n${propsText}\n}`;
  }
  
  /**
   * 从模式获取TypeScript类型
   */
  private getTypeFromSchema(
    schema: OpenAPIV3.SchemaObject, 
    fallbackName: string,
    options: {
      schemas: Record<string, OpenAPIV3.SchemaObject>;
      typeMapping?: Record<string, string>;
    }
  ): string {
    const { schemas, typeMapping } = options;
    
    // 处理引用
    if ('$ref' in schema) {
      // 从引用路径中提取名称
      const refParts = (schema as any).$ref.split('/');
      const refName = refParts[refParts.length - 1];
      
      // 应用自定义类型映射
      return typeMapping && typeMapping[refName] 
        ? typeMapping[refName] 
        : refName;
    }
    
    // 处理联合类型
    if (schema.oneOf || schema.anyOf) {
      const subSchemas = schema.oneOf || schema.anyOf || [];
      const types = subSchemas.map((subSchema, index) => 
        this.getTypeFromSchema(
          subSchema as OpenAPIV3.SchemaObject, 
          `${fallbackName}Option${index + 1}`, 
          options
        )
      );
      
      return types.join(' | ');
    }
    
    // 处理交叉类型
    if (schema.allOf) {
      const types = schema.allOf.map((subSchema, index) => 
        this.getTypeFromSchema(
          subSchema as OpenAPIV3.SchemaObject, 
          `${fallbackName}Part${index + 1}`, 
          options
        )
      );
      
      return types.join(' & ');
    }
    
    // 处理数组
    if (schema.type === 'array' && schema.items) {
      const itemType = this.getTypeFromSchema(
        schema.items as OpenAPIV3.SchemaObject, 
        `${fallbackName}Item`, 
        options
      );
      
      return `${itemType}[]`;
    }
    
    // 处理枚举
    if (schema.enum) {
      return schema.enum
        .map(value => typeof value === 'string' ? `'${value}'` : value)
        .join(' | ');
    }
    
    // 处理基本类型
    switch (schema.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'string':
        // 处理特殊格式
        if (schema.format === 'date' || schema.format === 'date-time') {
          return 'Date';
        }
        return 'string';
      case 'object':
        // 处理嵌套对象
        if (schema.properties) {
          const properties = schema.properties || {};
          const required = schema.required || [];
          
          const propDefs = Object.entries(properties).map(([propName, propSchema]) => {
            const isRequired = required.includes(propName);
            const questionMark = isRequired ? '' : '?';
            const propType = this.getTypeFromSchema(
              propSchema as OpenAPIV3.SchemaObject, 
              `${fallbackName}${this.capitalizeFirstLetter(propName)}`, 
              options
            );
            
            return `${propName}${questionMark}: ${propType}`;
          });
          
          return `{ ${propDefs.join('; ')} }`;
        }
        // 处理additionalProperties
        else if (schema.additionalProperties) {
          if (typeof schema.additionalProperties === 'boolean') {
            return schema.additionalProperties ? 'Record<string, any>' : '{}';
          } else {
            const propType = this.getTypeFromSchema(
              schema.additionalProperties as OpenAPIV3.SchemaObject, 
              `${fallbackName}Value`, 
              options
            );
            return `Record<string, ${propType}>`;
          }
        }
        return 'Record<string, any>';
      // 处理空类型或未知类型
      default:
        return 'any';
    }
  }
  
  /**
   * 首字母大写
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
} 