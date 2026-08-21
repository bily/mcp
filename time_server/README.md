# Time Server MCP

## 服务介绍

这是一个基于 MCP（Model Context Protocol）协议的 Python 时间服务。服务通过官方 `mcp.server.fastmcp`（FastMCP）实现，以 stdio 方式与 MCP 客户端通信，向 AI 应用提供获取指定时区当前时间与 Unix 时间戳的能力。支持任意 IANA 时区，默认时区可通过环境变量配置。

## 服务描述

Time Server MCP 是一个轻量级时间查询工具服务，提供两个工具：`get_current_time` 获取指定时区的格式化当前时间（如 `2026-08-21 15:30:00 CST (+0800)`），`get_current_timestamp` 获取当前 Unix 时间戳（秒）。服务以标准 stdio 传输运行，可无缝接入 Claude Desktop、Claude Code、Cherry Studio 等支持 MCP 的客户端，适合时间查询、时区换算、跨区域协作等场景。

## 类型

候选分类：实用工具 / 开发者工具 / 数据服务。本服务属于时间数据查询类实用工具，最终类型由系统根据正文内容自动判定。

## 服务配置

```json
{
  "mcpServers": {
    "time-server": {
      "command": "python",
      "args": ["time_server.py"],
      "env": {
        "TIME_SERVER_DEFAULT_TZ": "Asia/Shanghai"
      }
    }
  }
}
```

> 说明：`args` 中的 `time_server.py` 为仓库根目录下的相对路径；运行前需在仓库目录内执行 `pip install "mcp[cli]" "tzdata"` 安装依赖。

若已发布到 PyPI（见「发布到 PyPI」章节），可使用托管部署配置：

```json
{
  "mcpServers": {
    "time-server": {
      "command": "uvx",
      "args": ["time-server-mcp"],
      "env": {
        "TIME_SERVER_DEFAULT_TZ": "Asia/Shanghai"
      }
    }
  }
}
```

## 环境变量配置

服务配置中 `env` 字段定义的键值对如下：

| 变量名 | 默认值 | 必填 | 说明 |
|--------|--------|------|------|
| `TIME_SERVER_DEFAULT_TZ` | `Asia/Shanghai` | 否 | 默认时区（IANA 名称），调用工具未指定 `timezone` 参数时使用 |

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
├── time_server.py    # MCP 服务端实现
├── pyproject.toml    # 打包配置（发布 PyPI / 托管部署用）
└── README.md         # 本文档
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

## 客户端接入

将「服务配置」中的 `mcpServers` 内容合并到客户端的 MCP 配置文件中（如 Claude Desktop 的 `claude_desktop_config.json`），修改后需重启客户端生效。若使用虚拟环境，请将 `command` 改为 venv 中 `python.exe` 的绝对路径。

### Claude Code CLI

```bash
claude mcp add time-server -- python time_server.py
```

## 发布到 PyPI（托管部署可选）

如需在 ModelScope 选择「可托管部署」，需将服务发布到 PyPI：

```bash
pip install build twine
python -m build
twine upload dist/*
```

发布成功后，ModelScope 客户端配置使用 `uvx time-server-mcp` 方式连接。

## 使用示例

接入后，在客户端中直接向 AI 提问：

- "现在几点了？"
- "纽约现在是什么时间？"
- "获取当前 Unix 时间戳"

客户端会自动调用对应的 MCP 工具并返回结果。

## 扩展建议

- 如需远程访问，可将 `mcp.run()` 改为 `mcp.run(transport="sse")`，并通过 HTTP/SSE 连接。
- 可增加更多时间相关工具（如日期计算、时区转换、世界时钟列表）。
