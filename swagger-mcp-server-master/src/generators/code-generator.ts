/**
 * 代码生成器接口定义
 */

/**
 * 代码生成选项基础接口
 */
export interface CodeGeneratorOptions {
  /**
   * 输出目录
   */
  outputDir?: string;
  
  /**
   * 是否覆盖现有文件
   * @default false
   */
  overwrite?: boolean;
  
  /**
   * 文件前缀
   * @default ""
   */
  filePrefix?: string;
  
  /**
   * 文件后缀
   * @default ""
   */
  fileSuffix?: string;
}

/**
 * 代码生成结果
 */
export interface CodeGenerationResult {
  /**
   * 生成的文件路径列表
   */
  files: string[];
  
  /**
   * 生成状态
   */
  success: boolean;
  
  /**
   * 错误信息（如果有）
   */
  error?: string;
  
  /**
   * 警告信息列表
   */
  warnings?: string[];
}

/**
 * 代码生成器基础接口
 */
export interface CodeGenerator<T extends CodeGeneratorOptions> {
  /**
   * 生成代码
   * @param options 生成选项
   */
  generate(options: T): Promise<CodeGenerationResult>;
  
  /**
   * 获取生成器名称
   */
  getName(): string;
  
  /**
   * 获取生成器描述
   */
  getDescription(): string;
  
  /**
   * 验证选项是否有效
   * @param options 生成选项
   */
  validateOptions(options: T): boolean;
}

/**
 * 抽象代码生成器实现
 */
export abstract class BaseCodeGenerator<T extends CodeGeneratorOptions> implements CodeGenerator<T> {
  protected name: string;
  protected description: string;
  
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
  
  getName(): string {
    return this.name;
  }
  
  getDescription(): string {
    return this.description;
  }
  
  validateOptions(options: T): boolean {
    return true;
  }
  
  abstract generate(options: T): Promise<CodeGenerationResult>;
} 