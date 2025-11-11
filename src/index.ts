import { ClaudeCodeTool, ToolCollection } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/**
 * 售后订单处理 Agent
 *
 * 该 Agent 负责处理各种售后订单相关任务：
 * - 查询订单状态
 * - 处理退换货申请
 * - 处理退款申请
 * - 客户投诉处理
 * - 订单信息更新
 */

// 工具定义
const tools: ToolCollection = {
  // 查询订单信息
  query_order: {
    name: "query_order",
    description: "查询订单详细信息",
    inputSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "订单ID",
        },
        customer_phone: {
          type: "string",
          description: "客户手机号（可选）",
        },
      },
      required: ["order_id"],
    },
  },

  // 处理退换货申请
  process_return: {
    name: "process_return",
    description: "处理退换货申请",
    inputSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "订单ID",
        },
        reason: {
          type: "string",
          description: "退换货原因",
        },
        item_ids: {
          type: "array",
          items: {
            type: "string",
          },
          description: "需要退换的商品ID列表",
        },
        type: {
          type: "string",
          enum: ["return", "exchange"],
          description: "处理类型：退货或换货",
        },
      },
      required: ["order_id", "reason", "type"],
    },
  },

  // 处理退款申请
  process_refund: {
    name: "process_refund",
    description: "处理退款申请",
    inputSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "订单ID",
        },
        amount: {
          type: "number",
          description: "退款金额",
        },
        reason: {
          type: "string",
          description: "退款原因",
        },
        refund_method: {
          type: "string",
          enum: ["original", "wallet", "card"],
          description: "退款方式：原路退回、钱包、银行卡",
        },
      },
      required: ["order_id", "amount", "reason"],
    },
  },

  // 更新订单状态
  update_order_status: {
    name: "update_order_status",
    description: "更新订单状态",
    inputSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "订单ID",
        },
        status: {
          type: "string",
          enum: [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "returned",
            "refunded"
          ],
          description: "新的订单状态",
        },
        note: {
          type: "string",
          description: "状态更新备注",
        },
      },
      required: ["order_id", "status"],
    },
  },

  // 获取客户历史订单
  get_customer_history: {
    name: "get_customer_history",
    description: "获取客户历史订单信息",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "string",
          description: "客户ID",
        },
        customer_phone: {
          type: "string",
          description: "客户手机号",
        },
        limit: {
          type: "number",
          description: "返回记录数量限制（默认10）",
        },
      },
      required: ["customer_id"],
    },
  },
};

// Agent 主函数
async function main() {
  console.log("售后订单处理 Agent 已启动...");
  console.log("可用工具:", Object.keys(tools).join(", "));

  // 这里可以添加实际的数据源连接
  // 例如：数据库连接、API 客户端等
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Agent 启动失败:", error);
    process.exit(1);
  });
}

export { tools };
