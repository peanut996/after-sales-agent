import { query, tool } from "@anthropic-ai/claude-agent-sdk";
import readline from "readline";

import { checkAccessCodeRefund } from "./services";
import { CONVERSATION_SYSTEM_PROMPT, createQueryPrompt, DEFAULT_RESPONSES, isExitCommand } from "./prompts";
import { QUERY_OPTIONS, CHECK_TOOL_SECURITY_HOOKS } from "./config";
import type { ConversationMessage } from "./types";
import { z } from "zod";

// 直接注册工具
tool(
  "check_access_code_refund",
  "检查 access code 退款资格。该工具会调用生产环境 API 获取 access code 状态，并根据使用情况判断退款资格。如果符合退款条件，会返回详细的退款信息和比例。",
  {
    access_code: z.string().describe("需要检查的 access code")
  },
  async ({ access_code }: { access_code: string }) => {
    console.log(`\n🔍 正在检查 access code: ${access_code}...`);

    try {
      const result = await checkAccessCodeRefund(access_code);

      if (result.success) {
        console.log("✅ 检查完成！");
        console.log("📋 检查结果:");
        console.log(`   - Access Code: ${result.code}`);
        console.log(`   - 剩余次数: ${result.remainingUses}`);
        console.log(`   - 状态: ${result.isActive ? "激活" : "停用"}`);
        console.log(`   - 处理模式: ${result.processingMode}`);
        console.log(`   - 退款资格: ${result.eligible ? "✅ 符合" : "❌ 不符合"}`);
        console.log(`   - 退款比例: ${result.refundPercentage}%`);
        console.log(`   - 原因: ${result.reason}\n`);

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
      } else {
        console.log("❌ 检查失败！");
        console.log(`   - 原因: ${result.reason}\n`);

        return {
          content: [
            {
              type: "text" as const,
              text: `检查失败：${result.reason}`
            }
          ]
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ 检查过程中发生错误:", errorMessage);
      console.log("");

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
