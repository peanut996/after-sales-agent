/**
 * 对话模式的系统提示词
 */
export const CONVERSATION_SYSTEM_PROMPT = `你是一个专业的售后订单助手，专门处理 access code 退款相关问题。

可用工具：
- check_access_code_refund: 检查 access code 退款资格

功能说明：
1. 当用户询问退款资格时，使用 check_access_code_refund 工具
2. 提取 access code：可能从链接中提取（如 GhibliFlowStudio 链接）
3. 分析退款原因并提供建议
4. 保持友好专业的服务态度

回答要求：
- 使用中文
- 简洁明了
- 主动提供帮助
- 对于技术问题，解释清楚`;

/**
 * 查询模式的初始提示词模板
 * @param userQuery 用户查询内容
 * @returns 格式化的提示词
 */
export function createQueryPrompt(userQuery: string): string {
  return `你是一个专业的售后订单助手。用户查询：${userQuery}

请帮助用户检查 access code 退款资格。
可用工具：check_access_code_refund

规则：
1. 如果用户提供了 access code，请使用 check_access_code_refund 工具检查
2. 如果用户没有提供 access code，请提取文本中的 access code（8位以上字母数字）
3. 提供清晰、有用的回复
4. 使用中文回复
5. 保持专业友好的态度

用户查询：${userQuery}`;
}

/**
 * 默认回复内容
 */
export const DEFAULT_RESPONSES = [
  "我是您的售后订单助手。请提供您的 access code 或相关问题，我会尽力帮助您。",
  "您好！请提供需要检查的 access code，我可以帮您查询退款资格。",
  "请输入您的 access code（通常是 8 位以上的字母数字组合），我来帮您检查退款情况。"
];

/**
 * 帮助信息
 */
export const HELP_MESSAGE = {
  title: "🤖 售后订单助手已启动",
  usage: "使用参数:",
  chatOption: "  --chat 或 -c    启动交互式对话模式",
  queryOption: "  --query 或 -q   启动查询模式",
  directQuery: "  <text>          直接查询 access code",
  examples: "示例:",
  chatExample: "  npm run dev -- --chat",
  queryExample: "  npm run dev -- --query",
  directExample: "  npm run dev -- ABC12345"
};

/**
 * 检查是否是退出命令
 * @param input 用户输入
 * @returns 是否为退出命令
 */
export function isExitCommand(input: string): boolean {
  return input.toLowerCase() === "quit" || input.toLowerCase() === "exit";
}

/**
 * 从文本中提取 access code
 * @param text 输入文本
 * @returns 提取的 access code 或 null
 */
export function extractAccessCode(text: string): string | null {
  // 常见网站名称和关键词黑名单
  const blacklist = [
    'ghibliflow', 'ghibliflowstudio', 'studio', 'website', 'link', 'url',
    'http', 'https', 'www', 'com', 'org', 'net'
  ];

  // 查找所有8位以上的字母数字组合
  const matches = text.match(/[A-Z0-9]{8,}/gi) || [];

  for (const match of matches) {
    // 跳过黑名单中的词
    if (blacklist.some(word => match.toLowerCase().includes(word))) {
      continue;
    }

    // 跳过全相同字符的匹配（如 "AAAAAAAA" 或 "11111111"）
    if (/^([A-Z0-9])\1{7,}$/.test(match)) {
      continue;
    }

    // 如果匹配是合理的 access code 格式，返回第一个
    return match;
  }

  return null;
}
