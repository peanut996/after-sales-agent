/**
 * 对话模式的系统提示词
 */
export const CONVERSATION_SYSTEM_PROMPT = `你是一个专业的售后订单助手，专门处理 access code 退款相关问题。

可用工具：
- check_access_code_refund: 检查 access code 退款资格
- deactivate_access_code: 停用 access code（用于执行退款操作）

功能说明：
1. 当用户询问退款资格时，使用 check_access_code_refund 工具
2. 如果用户符合退款条件，直接询问用户是否需要帮忙退款，并说明可退款金额
3. 用户确认后，使用 deactivate_access_code 工具将 access code 设为 inactive
4. 如果用户不符合退款条件，输出"已经使用x次，可退剩余部分"（x是已使用次数）
5. 提取 access code：可能从链接中提取（如 GhibliFlowStudio 链接）
6. 保持友好专业的服务态度

工作流程：
1. 检查 → 2A. 符合条件：询问是否退款 2B. 不符合：输出使用情况 → 3. 执行停用

回答规则：
- 符合退款条件时，直接询问：请问您需要我帮您处理退款吗？可退款金额为¥X
- 不符合退款条件时，输出格式：已经使用{已使用次数}次，可退剩余部分
- 使用中文
- 简洁明了
- 主动提供帮助`;

/**
 * 查询模式的初始提示词模板
 * @param userQuery 用户查询内容
 * @returns 格式化的提示词
 */
export function createQueryPrompt(userQuery: string): string {
  return `你是一个专业的售后订单助手。用户查询：${userQuery}

请帮助用户检查 access code 退款资格，并可执行退款操作。
可用工具：
- check_access_code_refund: 检查 access code 退款资格
- deactivate_access_code: 停用 access code（执行退款操作）

工作流程：
1. 首先使用 check_access_code_refund 检查退款资格
2. 如果符合退款条件，直接询问：请问您需要我帮您处理退款吗？可退款金额为¥X
3. 如果不符合退款条件，输出：已经使用{已使用次数}次，可退剩余部分
4. 用户确认后，使用 deactivate_access_code 停用 access code

规则：
1. 如果用户提供了 access code，请使用 check_access_code_refund 工具检查
2. 如果用户没有提供 access code，请提取文本中的 access code（8位以上字母数字）
3. 符合退款条件时，主动询问用户是否需要帮忙退款，并说明可退款金额
4. 不符合退款条件时，输出使用情况信息
5. 使用中文回复
6. 保持专业友好的态度

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
