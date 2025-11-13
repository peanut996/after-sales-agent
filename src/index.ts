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

// 创建支持多行输入的处理器
function createMultilineInput(onSubmit: (message: string) => Promise<void>, promptText: string = "👤 您: ") {
  let inputBuffer = "";
  let cursorPosition = 0;
  let isProcessing = false;
  let lastInputTime = 0;
  let pasteMode = false;

  // 设置原始模式以捕获特殊键
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  const clearLine = () => {
    process.stdout.write('\r\x1b[K');
  };

  const redrawPrompt = () => {
    clearLine();
    process.stdout.write(`${promptText}${inputBuffer}`);
    // 移动光标到正确位置
    const offset = inputBuffer.length - cursorPosition;
    if (offset > 0) {
      process.stdout.write(`\x1b[${offset}D`);
    }
  };

  const handleInput = async () => {
    const message = inputBuffer.trim();
    inputBuffer = "";
    cursorPosition = 0;
    
    console.log(""); // 换行

    if (!message) {
      redrawPrompt();
      return;
    }

    if (isProcessing) {
      console.log("⚠️  正在处理中，请稍候...\n");
      redrawPrompt();
      return;
    }

    isProcessing = true;
    await onSubmit(message);
    isProcessing = false;
    redrawPrompt();
  };

  // 监听键盘输入
  const keyHandler = async (key: Buffer) => {
    const byte = key[0];
    const now = Date.now();
    
    // 检测粘贴：如果两次输入间隔小于 10ms，认为是粘贴
    if (now - lastInputTime < 10) {
      pasteMode = true;
    } else if (now - lastInputTime > 100) {
      // 超过 100ms，退出粘贴模式
      pasteMode = false;
    }
    lastInputTime = now;
    
    // Ctrl+C
    if (byte === 0x03) {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      console.log("\n👋 感谢使用，再见！");
      process.exit(0);
    }
    
    // Ctrl+D
    if (byte === 0x04) {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      console.log("\n👋 查询结束");
      process.exit(0);
    }
    
    const str = key.toString();
    
    // Enter 键处理
    if (key.length === 1 && byte === 0x0D) {
      if (pasteMode) {
        // 粘贴模式：添加换行
        inputBuffer = inputBuffer.slice(0, cursorPosition) + '\n' + inputBuffer.slice(cursorPosition);
        cursorPosition++;
        console.log("");
        process.stdout.write(promptText);
      } else {
        // 键盘输入：提交
        await handleInput();
      }
      return;
    }
    
    // Backspace
    if (byte === 0x7F || byte === 0x08) {
      if (cursorPosition > 0) {
        // 检查是否删除换行符
        if (inputBuffer[cursorPosition - 1] === '\n') {
          // 删除换行，需要重新绘制
          inputBuffer = inputBuffer.slice(0, cursorPosition - 1) + inputBuffer.slice(cursorPosition);
          cursorPosition--;
          // 上移一行
          process.stdout.write('\x1b[A');
          clearLine();
          // 重新显示当前行
          const lineStart = inputBuffer.lastIndexOf('\n', cursorPosition - 1) + 1;
          const nextNewline = inputBuffer.indexOf('\n', cursorPosition);
          const currentLine = nextNewline !== -1 ? inputBuffer.slice(lineStart, nextNewline) : inputBuffer.slice(lineStart);
          process.stdout.write(promptText + currentLine);
        } else {
          inputBuffer = inputBuffer.slice(0, cursorPosition - 1) + inputBuffer.slice(cursorPosition);
          cursorPosition--;
          redrawPrompt();
        }
      }
      return;
    }
    
    // 左箭头
    if (key.length === 3 && key[0] === 0x1B && key[1] === 0x5B && key[2] === 0x44) {
      if (cursorPosition > 0) {
        cursorPosition--;
        process.stdout.write('\x1b[D');
      }
      return;
    }
    
    // 右箭头
    if (key.length === 3 && key[0] === 0x1B && key[1] === 0x5B && key[2] === 0x43) {
      if (cursorPosition < inputBuffer.length) {
        cursorPosition++;
        process.stdout.write('\x1b[C');
      }
      return;
    }
    
    // 普通字符
    if (byte >= 0x20 || byte === 0x09) { // 可打印字符或 Tab
      inputBuffer = inputBuffer.slice(0, cursorPosition) + str + inputBuffer.slice(cursorPosition);
      cursorPosition += str.length;
      redrawPrompt();
    }
  };

  process.stdin.on('data', keyHandler);

  return {
    show: () => redrawPrompt(),
    cleanup: () => {
      process.stdin.removeListener('data', keyHandler);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    }
  };
}

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

// Query 模式 - 使用售后订单助手 + Tool
async function startQueryMode(resumeSessionId?: string) {
  console.log("\n" + "=".repeat(50));
  console.log("🤖 售后订单助手 - 智能查询模式");
  console.log("=".repeat(50));
  console.log("使用智能 SDK + 注册工具进行查询");
  console.log("💡 提示：粘贴文本会保留换行，键盘按 Enter 提交\n");

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

  let currentSessionId: string | undefined = resumeSessionId;

  const handleMessage = async (message: string) => {
    if (isExitCommand(message)) {
      console.log("\n👋 感谢使用，再见！");
      process.exit(0);
    }

    console.log("🤖 售后订单助手正在处理...\n");

    try {
      // 使用 SDK 的 query 功能
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
            console.log(`🤖 售后订单助手: ${textContent.text}\n`);
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
    }
  };

  // 创建多行输入处理器
  const input = createMultilineInput(handleMessage);
  input.show();
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
  console.log("💡 提示：粘贴文本会保留换行，键盘按 Enter 提交");
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

  let currentSessionId: string | undefined = resumeSessionId;

  const conversationHistory: ConversationMessage[] = [
    {
      role: "system",
      content: CONVERSATION_SYSTEM_PROMPT
    }
  ];

  const handleMessage = async (message: string) => {
    // 检查是否是退出命令
    if (isExitCommand(message)) {
      console.log("\n👋 感谢使用，再见！");
      process.exit(0);
    }

    console.log("🤖 助手: 正在思考中...\n");

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
      
      console.log(`🤖 助手: ${assistantText}\n`);
    } catch (e) {
      const fallback = DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
      conversationHistory.push({ role: "assistant", content: fallback });
      console.log(`🤖 助手: ${fallback}\n`);
    }
  };

  // 创建多行输入处理器
  const input = createMultilineInput(handleMessage);
  input.show();
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
      await startQueryMode(resumeSessionId);
    }
  } else {
    // 默认启动 Query 模式
    await startQueryMode();
  }
}

// 运行主程序
main().catch(console.error);
