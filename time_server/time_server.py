import os
from datetime import datetime
from zoneinfo import ZoneInfo

from mcp.server.fastmcp import FastMCP

# 创建 MCP 服务器实例
mcp = FastMCP("Time Server")

# 默认时区，可通过环境变量 TIME_SERVER_DEFAULT_TZ 覆盖
DEFAULT_TZ = os.environ.get("TIME_SERVER_DEFAULT_TZ", "Asia/Shanghai")


@mcp.tool()
def get_current_time(timezone: str = DEFAULT_TZ) -> str:
    """获取指定时区的当前时间。

    Args:
        timezone: IANA 时区名称，如 Asia/Shanghai、UTC、America/New_York 等

    Returns:
        格式化后的当前时间字符串，形如：2026-08-21 15:30:00 CST (+0800)
    """
    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("UTC")

    now = datetime.now(tz)
    return now.strftime("%Y-%m-%d %H:%M:%S %Z (%z)")


@mcp.tool()
def get_current_timestamp() -> int:
    """获取当前 Unix 时间戳（秒）。"""
    return int(datetime.now().timestamp())


if __name__ == "__main__":
    # 默认以 stdio 方式运行，供 MCP 客户端连接
    mcp.run()
