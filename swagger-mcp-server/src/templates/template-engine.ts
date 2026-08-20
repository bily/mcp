/**
 * 模板引擎
 * 负责模板解析和渲染
 */

import { FrameworkType } from "./template-manager";

/**
 * 模板变量处理函数
 */
export type TemplateVariableProcessor = (value: any) => string;

/**
 * 模板数据类型
 */
export type TemplateData = Record<string, any>;

/**
 * 模板变量值类型定义
 */
export type TemplateVariableValue = string | number | boolean | null | undefined | object | any[];

/**
 * 模板变量上下文定义
 */
export interface TemplateContext {
  [key: string]: TemplateVariableValue;
}

/**
 * 模板解析配置选项
 */
export interface TemplateEngineOptions {
  /**
   * 是否保留未匹配的变量
   * 如果为true，则不替换找不到值的变量
   * 如果为false，则将找不到值的变量替换为空字符串
   */
  preserveUnmatched?: boolean;
  
  /**
   * 变量开始标记
   * 默认为 {
   */
  tagStart?: string;
  
  /**
   * 变量结束标记
   * 默认为 }
   */
  tagEnd?: string;
  
  /**
   * 是否启用条件标记
   * 允许使用 {?var}...{/var} 形式的条件块
   */
  enableConditionals?: boolean;
  
  /**
   * 是否启用循环标记
   * 允许使用 {#array}...{/array} 形式的循环块
   */
  enableLoops?: boolean;
  
  /**
   * 是否启用包含标记
   * 允许使用 {>partial} 形式的包含其他模板
   */
  enablePartials?: boolean;
}

/**
 * 模板引擎类
 */
export class TemplateEngine {
  private options: TemplateEngineOptions;
  private partials: Map<string, string> = new Map();
    templateManager: any;
  
  /**
   * 构造函数
   */
  constructor(options: TemplateEngineOptions = {}) {
    this.options = {
      preserveUnmatched: false,
      tagStart: '{',
      tagEnd: '}',
      enableConditionals: true,
      enableLoops: true,
      enablePartials: true,
      ...options
    };
  }
  
  /**
   * 注册部分模板
   */
  registerPartial(name: string, template: string): void {
    this.partials.set(name, template);
  }
  
  /**
   * 渲染模板
   */
  render(template: string, context: TemplateContext = {}): string {
    let result = template;
    
    // 处理条件块
    if (this.options.enableConditionals) {
      result = this.processConditionals(result, context);
    }
    
    // 处理循环块
    if (this.options.enableLoops) {
      result = this.processLoops(result, context);
    }
    
    // 处理包含
    if (this.options.enablePartials) {
      result = this.processPartials(result, context);
    }
    
    // 处理简单变量替换
    result = this.processVariables(result, context);
    
    return result;
  }
  
  /**
   * 处理变量替换
   */
  private processVariables(template: string, context: TemplateContext): string {
    const { tagStart, tagEnd, preserveUnmatched } = this.options;
    const start = tagStart || '{';
    const end = tagEnd || '}';
    
    // 创建正则表达式匹配变量
    const varRegex = new RegExp(`${this.escapeRegExp(start)}([^#\\/\\?\\>\\{\\}]+?)${this.escapeRegExp(end)}`, 'g');
    
    return template.replace(varRegex, (match, path) => {
      path = path.trim();
      
      // 解析嵌套路径，如 'user.name'
      const value = this.getNestedValue(context, path);
      
      if (value === undefined || value === null) {
        return preserveUnmatched ? match : '';
      }
      
      return String(value);
    });
  }
  
  /**
   * 处理条件块
   */
  private processConditionals(template: string, context: TemplateContext): string {
    const { tagStart, tagEnd } = this.options;
    const start = tagStart || '{';
    const end = tagEnd || '}';
    
    // 创建正则表达式匹配条件块
    const condRegex = new RegExp(`${this.escapeRegExp(start)}\\?([^\\{\\}]+?)${this.escapeRegExp(end)}([\\s\\S]*?)${this.escapeRegExp(start)}\\/\\1${this.escapeRegExp(end)}`, 'g');
    
    return template.replace(condRegex, (match, path, content) => {
      path = path.trim();
      
      // 解析嵌套路径
      const value = this.getNestedValue(context, path);
      
      // 检查条件是否为真
      if (this.isTruthy(value)) {
        // 递归处理嵌套条件
        return this.processConditionals(content, context);
      }
      
      return '';
    });
  }
  
  /**
   * 处理循环块
   */
  private processLoops(template: string, context: TemplateContext): string {
    const { tagStart, tagEnd } = this.options;
    const start = tagStart || '{';
    const end = tagEnd || '}';
    
    // 创建正则表达式匹配循环块
    const loopRegex = new RegExp(`${this.escapeRegExp(start)}#([^\\{\\}]+?)${this.escapeRegExp(end)}([\\s\\S]*?)${this.escapeRegExp(start)}\\/\\1${this.escapeRegExp(end)}`, 'g');
    
    return template.replace(loopRegex, (match, path, content) => {
      path = path.trim();
      
      // 解析嵌套路径
      const value = this.getNestedValue(context, path);
      
      // 确保值是可迭代的
      if (!Array.isArray(value)) {
        return '';
      }
      
      // 处理每个循环项
      return value.map((item, index) => {
        // 创建循环项上下文
        const itemContext = {
          ...context,
          '@index': index,
          '@first': index === 0,
          '@last': index === value.length - 1,
          '@key': index,
          '.': item,
          'this': item
        };
        
        // 如果item是对象，则展开其属性到上下文中
        if (typeof item === 'object' && item !== null) {
          Object.assign(itemContext, item);
        }
        
        // 递归处理循环内容
        let itemContent = this.processConditionals(content, itemContext);
        itemContent = this.processLoops(itemContent, itemContext);
        return this.processVariables(itemContent, itemContext);
      }).join('');
    });
  }
  
  /**
   * 处理包含
   */
  private processPartials(template: string, context: TemplateContext): string {
    const { tagStart, tagEnd } = this.options;
    const start = tagStart || '{';
    const end = tagEnd || '}';
    
    // 创建正则表达式匹配包含
    const partialRegex = new RegExp(`${this.escapeRegExp(start)}\\>([^\\{\\}]+?)${this.escapeRegExp(end)}`, 'g');
    
    return template.replace(partialRegex, (match, name) => {
      name = name.trim();
      
      // 获取部分模板
      const partial = this.partials.get(name);
      
      if (!partial) {
        return `<!-- Partial '${name}' not found -->`;
      }
      
      // 递归渲染部分模板
      return this.render(partial, context);
    });
  }
  
  /**
   * 获取嵌套属性值
   */
  private getNestedValue(obj: any, path: string): any {
    // 处理特殊情况：空路径
    if (!path) {
      return obj;
    }
    
    // 处理点符号路径，如 'user.name'
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * 检查值是否为真
   */
  private isTruthy(value: any): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    
    return !!value;
  }
  
  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 渲染API客户端代码
   */
  async renderApiClient(
    framework: FrameworkType, 
    data: TemplateData
  ): Promise<string> {
    // 获取对应框架的模板
    const template = this.templateManager.getApiClientTemplate(framework);
    
    if (!template) {
      throw new Error(`API client template not found for framework: ${framework}`);
    }
    
    return this.renderContent(template.content, data);
  }
    renderContent(content: any, data: TemplateData): string | PromiseLike<string> {
        throw new Error("Method not implemented.");
    }
  
  /**
   * 渲染配置文件代码
   */
  async renderConfigFile(
    framework: FrameworkType, 
    data: TemplateData
  ): Promise<string> {
    // 获取对应框架的配置模板
    const template = this.templateManager.getConfigTemplate(framework);
    
    if (!template) {
      throw new Error(`Config template not found for framework: ${framework}`);
    }
    
    return this.renderContent(template.content, data);
  }
  
  /**
   * 渲染TypeScript类型定义
   */
  async renderTypeDefinition(
    type: 'interface' | 'enum', 
    data: TemplateData
  ): Promise<string> {
    // 获取对应类型的模板
    const templateId = type === 'interface' ? 'typescript-interface' : 'typescript-enum';
    const template = this.templateManager.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`TypeScript ${type} template not found`);
    }
    
    return this.renderContent(template.content, data);
  }
  
  /**
   * 添加自定义变量处理器
   */
  addVariableProcessor(name: string, processor: TemplateVariableProcessor): void {
    // Implementation needed
  }
} 