#!/bin/bash
# Swagger MCP工具服务器启动脚本

# 确保目录存在
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR" || exit

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请安装Node.js" >&2
    exit 1
fi

# 检查是否已经编译
if [ ! -d "./dist" ]; then
    echo "正在编译TypeScript代码..."
    npm run build
fi

# 默认配置
TRANSPORT_TYPE="stdio"
PORT=3000

# 解析命令行参数
if [ "$1" = "http" ]; then
    TRANSPORT_TYPE="http"
    if [ -n "$2" ]; then
        PORT="$2"
    fi
fi

# 清理已有进程（如果是HTTP模式）
if [ "$TRANSPORT_TYPE" = "http" ]; then
    echo "检查端口 $PORT 是否被占用..."
    PORT_PID=$(lsof -t -i:$PORT 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo "端口 $PORT 被进程 $PORT_PID 占用，尝试终止..."
        kill -9 "$PORT_PID" 2>/dev/null
        sleep 1
    fi
fi

echo "启动Swagger MCP工具服务器 (传输类型: $TRANSPORT_TYPE)"
if [ "$TRANSPORT_TYPE" = "http" ]; then
    echo "HTTP端口: $PORT"
    node dist/mcp-tools-server.js http "$PORT"
else
    node dist/mcp-tools-server.js
fi 