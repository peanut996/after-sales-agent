import {
  createSdkMcpServer,
  McpStdioServerConfig,
} from "@anthropic-ai/claude-agent-sdk";
import {
  checkAccessCodeRefundTool,
  simulateBrowserTool,
  deactivateAccessCodeTool,
} from "./tools";

/**
 * 创建售后工具 MCP 服务器
 */
const customMcpServer = createSdkMcpServer({
  name: "after_sales_tools",
  version: "1.0.0",
  tools: [checkAccessCodeRefundTool, deactivateAccessCodeTool],
});

/**
 * Chrome MCP Stdio 服务器配置
 */
const chromeMcp: McpStdioServerConfig = {
  type: "stdio",
  command: "npx",
  args: [
    "node",
    "/Users/peanut996/.nvm/versions/node/v22.21.0/lib/node_modules/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js",
  ],
};

/**
 * 所有 MCP 服务器的集合
 */
export const mcpServers = {
  after_sales_tools: customMcpServer
};

/**
 * 允许使用的 MCP 工具列表
 */
export const allowedMcpServerTools = [
  // After Sales Tools
  "mcp__after_sales_tools__check_access_code_refund",

  "mcp__after_sales_tools__deactivate_access_code",
];
