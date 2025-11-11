import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import readline from "readline";

import { checkAccessCodeRefund } from "./services";
import { CONVERSATION_SYSTEM_PROMPT, createQueryPrompt, DEFAULT_RESPONSES, isExitCommand } from "./prompts";
import { QUERY_OPTIONS, CHECK_TOOL_SECURITY_HOOKS } from "./config";
import type { ConversationMessage } from "./types";
import { z } from "zod";

// 定义工具
const checkAccessCodeRefundTool = tool(
  "check_access_code_refund",
  "检查 access code 退款资格。该工具会模拟浏览器访问 API 获取 access code 状态，避免代理拦截。如果符合退款条件，会返回详细的退款信息和比例。",
  {
    access_code: z.string().describe("需要检查的 access code")
  },
  async ({ access_code }: { access_code: string }) => {
    console.log(`\n🔍 正在检查 access code: ${access_code}...`);

    try {
      // 模拟浏览器访问 API
      const API_BASE_URL = "https://ghibliflowstudio.com/api";
      const API_TOKEN = process.env.GHIBLI_API_TOKEN;

      console.log(`📡 使用模拟浏览器访问: ${API_BASE_URL}/access-codes/${access_code}`);

      const response = await fetch(`${API_BASE_URL}/access-codes/${access_code}`, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Referer": "https://ghibliflowstudio.com/",
          "Origin": "https://ghibliflowstudio.com",
          "Authorization": `Bearer ${API_TOKEN}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });

      console.log(`📥 响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `检查失败：API 返回 ${response.status} 错误。可能是 access code 不存在或 API 权限不足。`
            }
          ]
        };
      }

      const data = await response.json() as { success: boolean; data: any };
      console.log(`📊 响应数据:`, JSON.stringify(data, null, 2));

      if (!data.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `检查失败：API 返回失败状态。`
            }
          ]
        };
      }

      const codeInfo = data.data;
      const validRefundAmounts = [10, 20, 100];

      let eligible = false;
      let refundPercentage = 0;
      let reason = "";

      if (validRefundAmounts.includes(codeInfo.usesRemaining)) {
        eligible = true;
        refundPercentage = 100;
        reason = "Access code 剩余次数符合退款条件，可全额退款";
      } else {
        reason = `Access code 剩余次数为 ${codeInfo.usesRemaining}，不在退款范围内。退款范围：10、20、100次`;
      }

      const result = {
        success: true,
        code: codeInfo.code,
        remainingUses: codeInfo.usesRemaining,
        isActive: codeInfo.isActive,
        processingMode: codeInfo.processingMode,
        eligible,
        refundPercentage,
        reason
      };

      console.log("✅ 检查完成！");
      console.log("📋 检查结果:", JSON.stringify(result, null, 2));

      return {
        content: [
          {
            type: "text" as const,
            text: `检查结果：
- Access Code: ${result.code}
- 剩余次数: ${result.remainingUses}
- 状态: ${result.isActive ? "激活" : "停用"}
- 处理模式: ${result.processingMode}
- 退款资格: ${result.eligible ? "符合" : "不符合"}
- 退款比例: ${result.refundPercentage}%
- 原因: ${result.reason}`
          }
        ]
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ 检查过程中发生错误:", errorMessage);

      return {
        content: [
          {
            type: "text" as const,
            text: `检查过程中发生错误: ${errorMessage}`
          }
        ]
      };
    }
  }
);

// 创建 MCP 服务器
const customMcpServer = createSdkMcpServer({
  name: "after_sales_tools",
  version: "1.0.0",
  tools: [checkAccessCodeRefundTool]
});

// 定义模拟浏览器工具
const simulateBrowserTool = tool(
  "simulate_browser_access",
  "模拟浏览器访问 API，避免代理拦截。通过设置 User-Agent、Cookie 和 Referer 来模拟真实浏览器行为。",
  {
    url: z.string().describe("要访问的 URL"),
    method: z.string().default("GET").describe("HTTP 方法"),
    headers: z.record(z.string()).optional().describe("自定义请求头"),
    data: z.any().optional().describe("请求体数据")
  },
  async ({ url, method = "GET", headers = {}, data }: { url: string; method?: string; headers?: Record<string, string>; data?: any }) => {
    try {
      console.log(`\n🌐 模拟浏览器访问: ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "DNT": "1",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          ...headers
        },
        body: data ? JSON.stringify(data) : undefined
      });

      const contentType = response.headers.get('content-type') || '';
      let result: any;

      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { html: text.substring(0, 500) + '...' };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `浏览器访问结果：
状态: ${response.status}
内容类型: ${contentType}
响应数据: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `浏览器访问失败: ${errorMessage}`
          }
        ]
      };
    }
  }
);

// 重新创建 MCP 服务器，包含模拟浏览器工具
const browserMcpServer = createSdkMcpServer({
  name: "browser_simulator",
  version: "1.0.0",
  tools: [simulateBrowserTool]
});



// Query 模式 - 使用 Claude Agent + Tool
async function startQueryMode() {
  console.log("\n" + "=".repeat(50));
  console.log("🤖 售后订单助手 - Claude Agent + Tool 模式");
  console.log("=".repeat(50));
  console.log("使用 Claude Agent SDK + 注册工具进行智能查询\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "👤 您: "
  });

  let isProcessing = false;

  const processInput = async (input: string) => {
    const message = input.trim();

    if (!message) {
      rl.prompt();
      return;
    }

    if (isExitCommand(message)) {
      console.log("\n👋 感谢使用，再见！");
      rl.close();
      return;
    }

    if (isProcessing) {
      console.log("⚠️  正在处理中，请稍候...\n");
      rl.prompt();
      return;
    }

    isProcessing = true;
    console.log("\n🤖 Claude Agent 正在处理...\n");

    try {
      // 使用 SDK 的 query 功能（Claude Agent + Tool）
      const q = query({
        prompt: createQueryPrompt(message),
        options: {
          ...QUERY_OPTIONS,
          mcpServers: {
            "after_sales_tools": customMcpServer,
            "browser_simulator": browserMcpServer
          },
          allowedTools: [
            "mcp__after_sales_tools__check_access_code_refund",
            "mcp__browser_simulator__simulate_browser_access"
          ],
          hooks: {
            PreToolUse: CHECK_TOOL_SECURITY_HOOKS.PreToolUse
          }
        }
      });

      for await (const msg of q) {
        if (msg.type === 'assistant' && msg.message) {
          const textContent = msg.message.content.find((c: any) => c.type === 'text');
          if (textContent && 'text' in textContent) {
            console.log(`🤖 Claude Agent: ${textContent.text}\n`);
          }
        }
      }
    } catch (error) {
      console.error("❌ 查询过程中发生错误:", error);
      console.log("");
    } finally {
      isProcessing = false;
      console.log(""); // 添加空行
      rl.prompt(); // 继续下一轮查询
    }
  };

  rl.on("line", async (input) => {
    await processInput(input);
  });

  rl.on("close", () => {
    console.log("\n👋 查询结束");
    process.exit(0);
  });

  rl.prompt();
}

// 交互式对话模式
async function startConversationMode() {
  console.log("\n" + "=".repeat(50));
  console.log("🤖 售后订单助手 - 对话模式");
  console.log("=".repeat(50));
  console.log("我可以帮助您：");
  console.log("  1. 检查 access code 退款资格");
  console.log("  2. 回答相关问题");
  console.log("\n输入 'quit' 或 'exit' 退出对话");
  console.log("-".repeat(50) + "\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "👤 您: "
  });

  const conversationHistory: ConversationMessage[] = [
    {
      role: "system",
      content: CONVERSATION_SYSTEM_PROMPT
    }
  ];

  const processMessage = async (message: string): Promise<string> => {
    // 检查是否是退出命令
    if (isExitCommand(message)) {
      return "quit";
    }

    conversationHistory.push({ role: "user", content: message });

    try {
      const historyText = conversationHistory
        .filter(m => m.role !== "system")
        .map(m => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`)
        .join("\n");

      const convoPrompt = `${CONVERSATION_SYSTEM_PROMPT}\n\n历史对话：\n${historyText}\n\n用户: ${message}\n\n请结合历史上下文继续对话，必要时引导用户提供 access code。`;

      const q = query({
        prompt: convoPrompt,
        options: {
          ...QUERY_OPTIONS,
          mcpServers: {
            "after_sales_tools": customMcpServer,
            "browser_simulator": browserMcpServer
          },
          allowedTools: [
            "mcp__after_sales_tools__check_access_code_refund",
            "mcp__browser_simulator__simulate_browser_access"
          ],
          hooks: { PreToolUse: CHECK_TOOL_SECURITY_HOOKS.PreToolUse }
        }
      });

      let assistantText = "";
      for await (const msg of q) {
        if (msg.type === "assistant" && msg.message) {
          const textContent = msg.message.content.find((c: any) => c.type === "text");
          if (textContent && "text" in textContent) {
            assistantText += textContent.text;
          }
        }
      }

      assistantText = assistantText || DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
      conversationHistory.push({ role: "assistant", content: assistantText });
      return assistantText;
    } catch (e) {
      const fallback = DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
      conversationHistory.push({ role: "assistant", content: fallback });
      return fallback;
    }
  };

  // 处理用户输入
  rl.prompt();

  rl.on("line", async (input) => {
    const message = input.trim();

    if (message) {
      console.log("🤖 助手: 正在思考中...\n");

      const response = await processMessage(message);

      if (response === "quit") {
        console.log("\n👋 感谢使用，再见！");
        rl.close();
      } else {
        console.log(`🤖 助手: ${response}\n`);
        rl.prompt(); // 继续下一轮对话
      }
    } else {
      rl.prompt(); // 继续下一轮对话
    }
  });

  rl.on("close", () => {
    console.log("\n👋 对话结束");
    process.exit(0);
  });
}

// 启动主程序
async function main() {
  // 从命令行参数判断模式
  const args = process.argv.slice(2);
  const mode = args[0];

  if (mode === "--chat" || mode === "-c") {
    // 启动对话模式（直接调用函数）
    await startConversationMode();
  } else {
    // 默认启动 Query 模式（使用 Claude Agent）
    await startQueryMode();
  }
}

// 运行主程序
main().catch(console.error);

// 导出工具供其他模块使用
export { checkAccessCodeRefund };
