import * as path from "path";
import type { HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

/**
 * 查询模式配置
 */
export const QUERY_OPTIONS = {
  maxTurns: 5,
  model: "opus" as const,
  allowedTools: [
    "mcp__after_sales_tools__check_access_code_refund",
    "mcp__browser_simulator__simulate_browser_access",
    "mcp__browser_simulator__deactivate_access_code"
  ] as string[]
};

/**
 * 安全钩子配置 - 防止意外的文件操作
 */
export const SECURITY_HOOKS = {
  PreToolUse: [
    {
      matcher: "Write|Edit|MultiEdit|Read",
      hooks: [
        async (input: any): Promise<HookJSONOutput> => {
          const toolName = input.tool_name;
          const toolInput = input.tool_input;

          if (!['Write', 'Edit', 'MultiEdit', 'Read'].includes(toolName)) {
            return { continue: true };
          }

          let filePath = '';
          if (toolName === 'Write' || toolName === 'Read') {
            filePath = toolInput.file_path || '';
          } else if (toolName === 'Edit' || toolName === 'MultiEdit') {
            filePath = toolInput.file_path || '';
          }

          // 防止访问系统敏感文件
          const sensitivePatterns = [
            '/etc/', '/usr/', '/var/', '/bin/', '/sbin/',
            '~/.ssh/', '~/.aws/', '~/.kube/',
            'package.json', 'package-lock.json', 'pnpm-lock.yaml',
            '.env', '.env.local', '.env.production'
          ];

          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.js' || ext === '.ts' || ext === '.json') {
            // 限制只能访问 agent 目录下的文件
            const allowedDir = path.join(process.cwd(), 'agent');
            if (!filePath.startsWith(allowedDir) && !filePath.startsWith(allowedDir.replace(/\\/g, '/'))) {
              return {
                decision: 'block',
                stopReason: `文件操作被阻止。为安全起见，只能在 agent 目录下操作文件。`,
                continue: false
              };
            }
          }

          // 检查敏感文件
          for (const pattern of sensitivePatterns) {
            if (filePath.includes(pattern.replace('~', process.env.HOME || ''))) {
              return {
                decision: 'block',
                stopReason: `不允许访问敏感文件: ${pattern}`,
                continue: false
              };
            }
          }

          return { continue: true };
        }
      ]
    }
  ]
};

/**
 * Check Access Code Refund 工具的安全钩子
 */
export const CHECK_TOOL_SECURITY_HOOKS = {
  PreToolUse: [
    {
      matcher: "mcp__after_sales_tools__check_access_code_refund" as const,
      hooks: [
        async (input: any): Promise<HookJSONOutput> => {
          // 添加安全检查
          return { continue: true };
        }
      ]
    },
    {
      matcher: "mcp__browser_simulator__simulate_browser_access" as const,
      hooks: [
        async (input: any): Promise<HookJSONOutput> => {
          const url = input.tool_input?.url;
          // 只允许访问 *.ghibliflowstudio.com 域名
          if (url && !url.includes('ghibliflowstudio.com')) {
            return {
              decision: 'block',
              stopReason: `只允许访问 ghibliflowstudio.com 域名，禁止访问: ${url}`,
              continue: false
            };
          }
          return { continue: true };
        }
      ]
    },
    {
      matcher: "mcp__browser_simulator__deactivate_access_code" as const,
      hooks: [
        async (input: any): Promise<HookJSONOutput> => {
          const accessCode = input.tool_input?.access_code;
          // 确保 access code 格式正确（8位以上字母数字）
          if (accessCode && !/^[A-Z0-9]{8,}$/i.test(accessCode)) {
            return {
              decision: 'block',
              stopReason: `Access code 格式不正确: ${accessCode}`,
              continue: false
            };
          }
          // 记录操作日志
          console.log(`🔒 安全检查通过：停用 access code ${accessCode}`);
          return { continue: true };
        }
      ]
    }
  ]
};
