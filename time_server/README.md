# Time Server MCP

一个基于 [MCP (Model Context Protocol)](https://modelcontextprotocol.io) 的 Python 服务，提供获取当前时间的能力。通过 `mcp.server.fastmcp` (FastMCP) 实现，以 stdio 方式与 MCP 客户端通信。

## 功能

| 工具名 | 描述 | 返回示例 |
|--------|------|----------|
| `get_current_time` | 获取指定时区的当前时间，支持任意 IANA 时区 | `2026-08-21 15:30:00 CST (+0800)` |
| `get_current_timestamp` | 获取当前 Unix 时间戳（秒） | `1784707800` |

## 环境要求

- Python 3.10+
- 操作系统：Windows / macOS / Linux 均可

## 安装依赖

```bash
pip install "mcp[cli]" "tzdata"
```

> `tzdata` 用于 Windows 下提供完整的 IANA 时区数据库；Linux/macOS 通常已内置，可不装。

## 文件结构

```
time-server/
├── time_server.py   # MCP 服务端实现
└── README.md        # 本文档
```

## 运行与调试

### 方式一：直接以 stdio 模式启动

```bash
python time_server.py
```

启动后进程会等待 MCP 客户端通过标准输入/输出进行 JSON-RPC 通信。

### 方式二：MCP Inspector 可视化调试

```bash
mcp dev time_server.py
```

该命令会启动本地调试面板，可查看工具列表、手动调用工具验证结果。

## 客户端接入配置

### Claude Desktop（或其他支持 stdio MCP 的客户端）

在客户端 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "time-server": {
      "command": "python",
      "args": ["time_server.py"]
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add time-server -- python "time_server.py"
```

### 注意事项

- `command` 需为 `python` 的实际可执行路径；若使用虚拟环境，请改为 venv 中的 `python.exe` 绝对路径。
- `args` 中的脚本路径必须是 `time_server.py` 的绝对路径，Windows 下反斜杠需转义为 `\\` 或直接使用正斜杠 `/`。
- 修改配置后需重启客户端使配置生效。

## 使用示例

接入后，在客户端中直接向 AI 提问：

- "现在几点了？"
- "纽约现在是什么时间？"
- "获取当前 Unix 时间戳"

客户端会自动调用对应的 MCP 工具并返回结果。

## 扩展建议

- 如需远程访问，可将 `mcp.run()` 改为 `mcp.run(transport="sse")`，并通过 HTTP/SSE 连接。
- 可增加更多时间相关工具（如日期计算、时区转换、世界时钟列表）。
