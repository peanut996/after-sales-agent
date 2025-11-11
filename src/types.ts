/**
 * Access Code 信息接口
 */
export interface AccessCodeInfo {
  code: string;
  usesRemaining: number;
  isActive: boolean;
  processingMode: string;
}

/**
 * 退款检查结果接口
 */
export interface CheckResult {
  success: boolean;
  code?: string;
  initialUses?: number;
  remainingUses?: number;
  isActive?: boolean;
  processingMode?: string;
  eligible: boolean;
  refundPercentage: number;
  reason: string;
  message?: string;
}

/**
 * 对话历史记录
 */
export interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * 工具输入参数
 */
export interface ToolInput {
  [key: string]: any;
}

/**
 * 消息内容类型
 */
export interface MessageContent {
  type: "text";
  text: string;
}

/**
 * 工具返回内容
 */
export interface ToolResult {
  content: MessageContent[];
}

/**
 * 处理模式枚举
 */
export enum ProcessingMode {
  STANDARD = "standard",
  FAST = "fast",
  BATCH = "batch"
}

/**
 * 状态枚举
 */
export enum Status {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  EXPIRED = "expired"
}
