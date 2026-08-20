# Swagger MCP 服务器

[![smithery badge](https://smithery.ai/badge/@tuskermanshu/swagger-mcp-server)](https://smithery.ai/server/@tuskermanshu/swagger-mcp-server)

一个基于Model Context Protocol (MCP)的服务器，用于解析Swagger/OpenAPI文档并生成TypeScript类型和API客户端代码。

## 功能特点

- 解析Swagger/OpenAPI文档，支持v2和v3规范
- 生成TypeScript类型定义
- 生成不同框架的API客户端代码（Axios、Fetch、React Query等）
- 通过MCP协议提供这些功能，便于与大型语言模型集成
- **优化的大型文档处理**：
  - 内存和文件系统缓存机制
  - 懒加载解析策略
  - 增量解析与部分结果返回
  - 进度反馈
  - 自动识别不同格式的Swagger UI URLs

## 快速开始

### 安装依赖

```bash
npm install
# 或者使用pnpm
pnpm install
```

### 启动服务器

```bash
node start-server.js
```

服务器默认使用标准输入/输出通信。

### 使用MCP工具

可以通过标准输入/输出与MCP服务器通信。以下是一些示例：

```bash
# 解析Swagger文档
node examples/optimized-swagger-parser-example.js

# 生成TypeScript类型
node examples/typescript-generator-example.js

# 生成API客户端
node examples/api-client-generator-example.js
```

## 可用工具

### 1. Swagger/OpenAPI解析工具

#### 标准解析工具 (parse-swagger)

```json
{
  "method": "parse-swagger",
  "params": {
    "url": "https://petstore3.swagger.io/api/v3/openapi.json",
    "includeSchemas": true,
    "includeDetails": true
  }
}
```

#### 优化解析工具 (parse-swagger-optimized)

适用于完整解析，带有高级选项：

```json
{
  "method": "parse-swagger-optimized",
  "params": {
    "url": "https://petstore3.swagger.io/api/v3/openapi.json",
    "includeSchemas": true,
    "includeDetails": true,
    "useCache": true,
    "skipValidation": true,
    "cacheTTLMinutes": 60,
    "lazyLoading": false,
    "filterTag": "pet"
  }
}
```

#### 轻量级解析工具 (parse-swagger-lite)

为大型文档优化，快速但只返回基本信息：

```json
{
  "method": "parse-swagger-lite",
  "params": {
    "url": "https://petstore3.swagger.io/api/v3/openapi.json",
    "includeSchemas": false,
    "includeDetails": false,
    "useCache": true,
    "skipValidation": true
  }
}
```

### 2. TypeScript类型生成工具

#### 标准类型生成器 (generate-typescript-types)

```json
{
  "method": "generate-typescript-types",
  "params": {
    "swaggerUrl": "https://petstore3.swagger.io/api/v3/openapi.json",
    "outputDir": "./generated/types",
    "namespace": "PetStore",
    "strictTypes": true,
    "generateEnums": true,
    "generateIndex": true
  }
}
```

#### 优化类型生成器 (generate-typescript-types-optimized)

```json
{
  "method": "generate-typescript-types-optimized",
  "params": {
    "swaggerUrl": "https://petstore3.swagger.io/api/v3/openapi.json",
    "outputDir": "./generated/types",
    "namespace": "PetStore",
    "strictTypes": true,
    "useCache": true,
    "skipValidation": true,
    "lazyLoading": true,
    "includeSchemas": ["Pet", "Order", "User"]
  }
}
```

### 3. API客户端生成工具

#### 标准API客户端生成器 (generate-api-client)

```json
{
  "method": "generate-api-client",
  "params": {
    "swaggerUrl": "https://petstore3.swagger.io/api/v3/openapi.json",
    "outputDir": "./generated/api",
    "clientType": "axios",
    "generateTypeImports": true,
    "typesImportPath": "../types",
    "groupBy": "tag"
  }
}
```

#### 优化API客户端生成器 (generate-api-client-optimized)

```json
{
  "method": "generate-api-client-optimized",
  "params": {
    "swaggerUrl": "https://petstore3.swagger.io/api/v3/openapi.json",
    "outputDir": "./generated/api",
    "clientType": "react-query",
    "generateTypeImports": true,
    "typesImportPath": "../types",
    "groupBy": "tag",
    "useCache": true,
    "skipValidation": true,
    "lazyLoading": true,
    "includeTags": ["pet", "store"]
  }
}
```

### 4. 文件写入工具

```json
{
  "method": "file-writer",
  "params": {
    "filePath": "./output.txt",
    "content": "Hello, world!",
    "createDirs": true
  }
}
```

## 处理大型API文档

对于大型API文档，推荐使用以下配置：

1. 使用优化版工具，启用缓存和懒加载
2. 使用标签或路径前缀过滤，只获取需要的API操作
3. 仅在必要时包含模式定义
4. 设置合理的缓存有效期，避免频繁重新解析

示例：

```json
{
  "method": "parse-swagger-lite",
  "params": {
    "url": "https://your-large-api-doc-url.json",
    "useCache": true,
    "skipValidation": true,
    "lazyLoading": true,
    "filterTag": "your-specific-tag",
    "includeSchemas": false
  }
}
```

## 支持的客户端框架

目前支持以下API客户端框架：

- **Axios**: 功能全面的Promise基HTTP客户端
- **Fetch**: 浏览器原生API，无需额外依赖
- **React Query**: 用于React应用的数据获取和缓存库，提供hooks和缓存功能

示例 - 生成React Query客户端:

```json
{
  "method": "generate-api-client-optimized",
  "params": {
    "swaggerUrl": "https://petstore3.swagger.io/api/v3/openapi.json",
    "outputDir": "./generated/react-query",
    "clientType": "react-query",
    "generateTypeImports": true
  }
}
```

## 缓存管理

API文档缓存存储在 `.api-cache` 目录中。如果需要清除缓存：

1. 删除 `.api-cache` 目录
2. 或者设置 `useCache: false` 参数

## 配置选项

可在 `swagger-mcp-config.json` 中自定义服务器设置：

```json
{
  "name": "Swagger MCP Server",
  "version": "1.0.0",
  "transport": "stdio"
}
```

## 开发与调试

启动调试服务器：

```bash
node start-server.js
```

然后使用MCP Inspector连接：

```bash
npx @modelcontextprotocol/inspector pipe -- node start-server.js
```

或者直接方式（但可能导致输出混乱）：

```bash
npx @modelcontextprotocol/inspector -- node start-server.js
```

## 项目路线图

参见 [road.md](road.md) 文件了解开发计划和进度。

## 安装

### 通过Smithery安装

要通过[Smithery](https://smithery.ai/server/@tuskermanshu/swagger-mcp-server)为Claude Desktop自动安装swagger-mcp-server：

```bash
npx -y @smithery/cli install @tuskermanshu/swagger-mcp-server --client claude
```

## 构建

```bash
# 构建项目
npm run build

# 或使用pnpm
pnpm build
```

## 可用的MCP工具

1. `parse-swagger` - 解析Swagger/OpenAPI文档，返回API操作信息
2. `parse-swagger-optimized` - 解析Swagger/OpenAPI文档（优化版）
3. `parse-swagger-lite` - 轻量级解析Swagger/OpenAPI文档，专为大型文档优化
4. `generate-typescript-types` - 从Swagger/OpenAPI文档生成TypeScript类型定义
5. `generate-typescript-types-optimized` - 从Swagger/OpenAPI文档生成TypeScript类型定义（优化版）
6. `generate-api-client` - 从Swagger/OpenAPI文档生成API客户端代码
7. `generate-api-client-optimized` - 从Swagger/OpenAPI文档生成API客户端代码（优化版）
8. `file-writer` - 将内容写入文件系统 