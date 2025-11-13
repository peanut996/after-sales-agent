import { query } from "@anthropic-ai/claude-agent-sdk";
import readline from "readline";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

import { CONVERSATION_SYSTEM_PROMPT, createQueryPrompt, DEFAULT_RESPONSES, isExitCommand } from "./prompts";
import { QUERY_OPTIONS, CHECK_TOOL_SECURITY_HOOKS } from "./config";
import type { ConversationMessage, SessionInfo } from "./types";
import { mcpServers, allowedMcpServerTools } from "./mcp-servers";

// Session 存储路径
const SESSION_DIR = path.join(process.cwd(), ".sessions");
const SESSION_FILE = path.join(SESSION_DIR, "sessions.json");

// 确保 session 目录存在
function ensureSessionDir() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

// 保存 session
function saveSession(sessionInfo: SessionInfo) {
  ensureSessionDir();
  const sessions: SessionInfo[] = loadSessions();
  const existingIndex = sessions.findIndex(s => s.id === sessionInfo.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = sessionInfo;
  } else {
    sessions.push(sessionInfo);
  }
  
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

// 加载所有 sessions
function loadSessions(): SessionInfo[] {
  ensureSessionDir();
  if (!fs.existsSync(SESSION_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(SESSION_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 获取 session
function getSession(sessionId: string): SessionInfo | undefined {
  const sessions = loadSessions();
  return sessions.find(s => s.id === sessionId);
}

// Query 模式 - 使用 Claude Agent + Tool
async function startQueryMode(resumeSessionId?: string) {
  console.log("\n" + "=".repeat(50));
  console.log("🤖 售后订单助手 - Claude Agent + Tool 模式");
  console.log("=".repeat(50));
  console.log("使用 Claude Agent SDK + 注册工具进行智能查询\n");

  if (resumeSessionId) {
    const session = getSession(resumeSessionId);
    if (session) {
      console.log(`📂 恢复 Session: ${resumeSessionId}`);
      console.log(`   创建时间: ${new Date(session.createdAt).toLocaleString()}`);
      console.log(`   最后访问: ${new Date(session.lastAccessedAt).toLocaleString()}\n`);
    } else {
      console.log(`⚠️  未找到 Session: ${resumeSessionId}，将创建新 Session\n`);
      resumeSessionId = undefined;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "👤 您: "
  });

  let isProcessing = false;
  let currentSessionId: string | undefined = resumeSessionId;

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
          mcpServers: mcpServers,
          allowedTools: allowedMcpServerTools,
          hooks: {
            PreToolUse: CHECK_TOOL_SECURITY_HOOKS.PreToolUse
          },
          ...(currentSessionId && { resume: currentSessionId })
        }
      });

      for await (const msg of q) {
        // 捕获 session ID
        if (msg.type === 'system' && msg.subtype === 'init') {
          currentSessionId = msg.session_id;
          const sessionInfo: SessionInfo = {
            id: currentSessionId,
            mode: "query",
            createdAt: new Date(),
            lastAccessedAt: new Date()
          };
          saveSession(sessionInfo);
        }

        if (msg.type === 'assistant' && msg.message) {
          const textContent = msg.message.content.find((c: any) => c.type === 'text');
          if (textContent && 'text' in textContent) {
            console.log(`🤖 Claude Agent: ${textContent.text}\n`);
          }
        }
      }

      // 更新 session 最后访问时间
      if (currentSessionId) {
        const session = getSession(currentSessionId);
        if (session) {
          session.lastAccessedAt = new Date();
          saveSession(session);
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
async function startConversationMode(resumeSessionId?: string) {
  console.log("\n" + "=".repeat(50));
  console.log("🤖 售后订单助手 - 对话模式");
  console.log("=".repeat(50));
  console.log("我可以帮助您：");
  console.log("  1. 检查 access code 退款资格");
  console.log("  2. 回答相关问题");
  console.log("\n输入 'quit' 或 'exit' 退出对话");
  console.log("-".repeat(50) + "\n");

  if (resumeSessionId) {
    const session = getSession(resumeSessionId);
    if (session) {
      console.log(`📂 恢复 Session: ${resumeSessionId}`);
      console.log(`   创建时间: ${new Date(session.createdAt).toLocaleString()}`);
      console.log(`   最后访问: ${new Date(session.lastAccessedAt).toLocaleString()}\n`);
    } else {
      console.log(`⚠️  未找到 Session: ${resumeSessionId}，将创建新 Session\n`);
      resumeSessionId = undefined;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "👤 您: "
  });

  let currentSessionId: string | undefined = resumeSessionId;

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
          mcpServers: mcpServers,
          allowedTools: allowedMcpServerTools,
          hooks: { PreToolUse: CHECK_TOOL_SECURITY_HOOKS.PreToolUse },
          ...(currentSessionId && { resume: currentSessionId })
        }
      });

      let assistantText = "";
      for await (const msg of q) {
        // 捕获 session ID
        if (msg.type === 'system' && msg.subtype === 'init') {
          currentSessionId = msg.session_id;
          const sessionInfo: SessionInfo = {
            id: currentSessionId,
            mode: "conversation",
            createdAt: new Date(),
            lastAccessedAt: new Date()
          };
          saveSession(sessionInfo);
        }

        if (msg.type === "assistant" && msg.message) {
          const textContent = msg.message.content.find((c: any) => c.type === "text");
          if (textContent && "text" in textContent) {
            assistantText += textContent.text;
          }
        }
      }

      // 更新 session 最后访问时间
      if (currentSessionId) {
        const session = getSession(currentSessionId);
        if (session) {
          session.lastAccessedAt = new Date();
          saveSession(session);
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

// 列出所有 sessions
function listSessions() {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    console.log("\n📋 暂无保存的 Session\n");
    return;
  }

  console.log("\n📋 已保存的 Sessions:");
  console.log("=".repeat(70));
  sessions.forEach((session, index) => {
    console.log(`${index + 1}. ID: ${session.id}`);
    console.log(`   模式: ${session.mode === "query" ? "Query 模式" : "对话模式"}`);
    console.log(`   创建时间: ${new Date(session.createdAt).toLocaleString()}`);
    console.log(`   最后访问: ${new Date(session.lastAccessedAt).toLocaleString()}`);
    console.log("-".repeat(70));
  });
  console.log("");
}

// 启动主程序
async function main() {
  // 从命令行参数判断模式
  const args = process.argv.slice(2);
  const mode = args[0];
  const resumeSessionId = args[1];

  // 列出所有 sessions
  if (mode === "--list" || mode === "-l") {
    listSessions();
    return;
  }

  if (mode === "--chat" || mode === "-c") {
    // 启动对话模式（直接调用函数）
    await startConversationMode(resumeSessionId);
  } else if (mode === "--resume" || mode === "-r") {
    // 恢复 session
    if (!resumeSessionId) {
      console.log("❌ 请提供 Session ID");
      console.log("使用方式: npm run dev -- --resume <session-id>");
      listSessions();
      return;
    }
    const session = getSession(resumeSessionId);
    if (!session) {
      console.log(`❌ 未找到 Session: ${resumeSessionId}`);
      listSessions();
      return;
    }
    if (session.mode === "query") {
      await startQueryMode(resumeSessionId);
    } else {
      await startConversationMode(resumeSessionId);
    }
  } else {
    // 默认启动 Query 模式（使用 Claude Agent）
    await startQueryMode();
  }
}

// 运行主程序
main().catch(console.error);
