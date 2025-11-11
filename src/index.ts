import { query } from "@anthropic-ai/claude-agent-sdk";
import readline from "readline";

import { initTools } from "./tools";
import { checkAccessCodeRefund } from "./services";
import { CONVERSATION_SYSTEM_PROMPT, createQueryPrompt, DEFAULT_RESPONSES, isExitCommand, extractAccessCode } from "./prompts";
import { QUERY_OPTIONS, CHECK_TOOL_SECURITY_HOOKS } from "./config";
import type { ConversationMessage } from "./types";

// 初始化工具
initTools();

/**
 * Access Code 退款资格检查 Agent
 *
 * 该 Agent 专门负责检查 access code 的退款资格：
 * - 从 GhibliFlowStudio 链接中提取 access code
 * - 调用生产环境 API 获取 access code 信息
 * - 根据使用情况和状态判断退款资格
 * - 计算退款比例并提供详细报告
 * - 支持交互式对话模式
 */

// 查询模式 - 使用 SDK 的 query 功能
async function startQueryMode() {
  console.log("\n" + "=".repeat(50));
  console.log("🤖 售后订单助手 - SDK 查询模式");
  console.log("=".repeat(50));
  console.log("使用 Claude Agent SDK 进行智能查询\n");

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
      // 使用 SDK 的 query 功能
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

// 运行单次查询
async function runSingleQuery(prompt: string) {
  // 检查是否是退出命令
  if (isExitCommand(prompt)) {
    console.log("\n👋 感谢使用，再见！");
    process.exit(0);
    return;
  }

  try {
    // 使用 SDK 的 query 功能
    const q = query({
      prompt: createQueryPrompt(prompt),
      options: {
        ...QUERY_OPTIONS,
        hooks: {
          PreToolUse: CHECK_TOOL_SECURITY_HOOKS.PreToolUse
        }
      }
    });

    for await (const message of q) {
      if (message.type === 'assistant' && message.message) {
        const textContent = message.message.content.find((c: any) => c.type === 'text');
        if (textContent && 'text' in textContent) {
          console.log(`🤖 Claude Agent: ${textContent.text}\n`);
        }
      }
    }
  } catch (error) {
    console.error("❌ 查询过程中发生错误:", error);
    console.log("");
  }
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
