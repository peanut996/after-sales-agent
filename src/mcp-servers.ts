import { createSdkMcpServer, McpStdioServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { checkAccessCodeRefundTool, simulateBrowserTool, deactivateAccessCodeTool } from "./tools";

/**
 * 创建售后工具 MCP 服务器
 */
const customMcpServer = createSdkMcpServer({
  name: "after_sales_tools",
  version: "1.0.0",
  tools: [checkAccessCodeRefundTool]
});

/**
 * 创建浏览器模拟器 MCP 服务器
 */
const browserMcpServer = createSdkMcpServer({
  name: "browser_simulator",
  version: "1.0.0",
  tools: [simulateBrowserTool, deactivateAccessCodeTool]
});

/**
 * Chrome MCP Stdio 服务器配置
 */
const chromeMcp: McpStdioServerConfig = {
  type: 'stdio',
  command: "npx",
  args: [
    "node",
    "/Users/peanut996/.nvm/versions/node/v22.21.0/lib/node_modules/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js"
  ]
};

/**
 * 所有 MCP 服务器的集合
 */
export const mcpServers = {
  "after_sales_tools": customMcpServer,
  "browser_simulator": browserMcpServer,
  "chrome-mcp-stdio": chromeMcp
};

/**
 * 允许使用的 MCP 工具列表
 */
export const allowedMcpServerTools = [
  // After Sales Tools
  "mcp__after_sales_tools__check_access_code_refund",

  // Browser Simulator
  "mcp__browser_simulator__simulate_browser_access",
  "mcp__browser_simulator__deactivate_access_code",

  // Chrome MCP Stdio - 浏览器管理
  "mcp__chrome_mcp_stdio__get_windows_and_tabs",
  "mcp__chrome_mcp_stdio__chrome_navigate",
  "mcp__chrome_mcp_stdio__chrome_close_tabs",
  "mcp__chrome_mcp_stdio__chrome_switch_tab",
  "mcp__chrome_mcp_stdio__chrome_go_back_or_forward",

  // Chrome MCP Stdio - 截图和视觉
  "mcp__chrome_mcp_stdio__chrome_screenshot",

  // Chrome MCP Stdio - 网络监控
  "mcp__chrome_mcp_stdio__chrome_network_capture_start",
  "mcp__chrome_mcp_stdio__chrome_network_capture_stop",
  "mcp__chrome_mcp_stdio__chrome_network_debugger_start",
  "mcp__chrome_mcp_stdio__chrome_network_debugger_stop",
  "mcp__chrome_mcp_stdio__chrome_network_request",

  // Chrome MCP Stdio - 内容分析
  "mcp__chrome_mcp_stdio__search_tabs_content",
  "mcp__chrome_mcp_stdio__chrome_get_web_content",
  "mcp__chrome_mcp_stdio__chrome_get_interactive_elements",

  // Chrome MCP Stdio - 交互操作
  "mcp__chrome_mcp_stdio__chrome_click_element",
  "mcp__chrome_mcp_stdio__chrome_fill_or_select",
  "mcp__chrome_mcp_stdio__chrome_keyboard",

  // Chrome MCP Stdio - 数据管理
  "mcp__chrome_mcp_stdio__chrome_history",
  "mcp__chrome_mcp_stdio__chrome_bookmark_search",
  "mcp__chrome_mcp_stdio__chrome_bookmark_add",
  "mcp__chrome_mcp_stdio__chrome_bookmark_delete"
];