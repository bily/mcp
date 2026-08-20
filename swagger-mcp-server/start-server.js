#!/usr/bin/env node

/**
 * Swagger MCP 服务器启动脚本
 */
const path = require('path');
const fs = require('fs');

// 检查默认配置文件是否存在，如不存在则创建
const defaultConfigPath = path.join(process.cwd(), 'swagger-mcp-config.json');
if (!fs.existsSync(defaultConfigPath)) {
  // 创建默认配置
  const defaultConfig = {
    name: "Swagger MCP Server",
    version: "1.0.0",
    transport: "stdio"
  };
  
  fs.writeFileSync(
    defaultConfigPath, 
    JSON.stringify(defaultConfig, null, 2), 
    'utf8'
  );
  
  console.log(`📝 已创建默认配置文件: ${defaultConfigPath}`);
}

// 启动服务器
try {
  const configPath = process.argv[2] || defaultConfigPath;
  console.log(`🚀 正在启动Swagger MCP服务器，使用配置文件: ${configPath}`);
  
  // 导入并启动主函数
  require('./dist/index.js').main(configPath);
} catch (error) {
  console.error('❌ 启动失败:', error);
  process.exit(1);
} 