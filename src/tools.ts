import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/**
 * 检查 access code 退款资格工具
 */
export const checkAccessCodeRefundTool = tool(
  "check_access_code_refund",
  "查询 access code 使用信息。该工具会获取 access code 的使用状态和剩余次数，用于判断退款资格。",
  {
    access_code: z.string().describe("需要查询的 access code")
  },
  async ({ access_code }: { access_code: string }) => {
    try {
      // 模拟浏览器访问 API
      const API_BASE_URL = "https://ghibliflowstudio.com/api";
      const API_TOKEN = process.env.GHIBLI_API_TOKEN;

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
      
      // 计算已使用次数（默认按10次计算总次数）
      const initialUses = codeInfo.initialUses || 10;
      const remainingUses = codeInfo.usesRemaining;
      const usedTimes = initialUses - remainingUses;

      // 计算退款金额（10次=5元，单价0.5元/次）
      const pricePerUse = 0.5;
      const totalPrice = initialUses * pricePerUse;
      const refundAmount = remainingUses * pricePerUse;
      
      // 根据剩余次数计算退款比例
      const refundPercentage = initialUses > 0 ? Math.round((remainingUses / initialUses) * 100) : 0;

      const validRefundAmounts = [10, 20, 100];
      let eligible = false;
      let reason = "";

      if (validRefundAmounts.includes(remainingUses)) {
        eligible = true;
        reason = `Access code 剩余 ${remainingUses} 次，符合退款条件，可退款 ${refundPercentage}%（¥${refundAmount}）`;
      } else {
        reason = `Access code 剩余次数为 ${remainingUses}，不在退款范围内。退款范围：10、20、100次`;
      }

      const result = {
        success: true,
        code: codeInfo.code,
        initialUses,
        remainingUses,
        usedTimes,
        isActive: codeInfo.isActive,
        processingMode: codeInfo.processingMode,
        eligible,
        refundPercentage,
        reason,
        totalPrice,
        refundAmount
      };

      return {
        content: [
          {
            type: "text" as const,
            text: `查询结果：
- Access Code: ${result.code}
- 总次数: ${result.initialUses} 次
- 已使用: ${result.usedTimes} 次
- 剩余次数: ${result.remainingUses} 次
- 状态: ${result.isActive ? "激活" : "停用"}
- 处理模式: ${result.processingMode}
- 退款资格: ${result.eligible ? "符合" : "不符合"}
- 退款比例: ${result.refundPercentage}%
- 价格信息: 总价¥${result.totalPrice}，可退款¥${result.refundAmount}
- 原因: ${result.reason}`
          }
        ]
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ 查询过程中发生错误:", errorMessage);

      return {
        content: [
          {
            type: "text" as const,
            text: `查询过程中发生错误: ${errorMessage}`
          }
        ]
      };
    }
  }
);

/**
 * 查询 API 工具
 */
export const simulateBrowserTool = tool(
  "simulate_browser_access",
  "查询 API 接口，获取数据信息。通过标准 HTTP 请求获取所需数据。",
  {
    url: z.string().describe("要访问的 URL"),
    method: z.string().default("GET").describe("HTTP 方法"),
    headers: z.record(z.string()).optional().describe("自定义请求头"),
    data: z.any().optional().describe("请求体数据")
  },
  async ({ url, method = "GET", headers = {}, data }: { url: string; method?: string; headers?: Record<string, string>; data?: any }) => {
    try {
      console.log(`\n🌐 查询 API: ${url}`);

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
            text: `查询结果：
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
            text: `查询失败: ${errorMessage}`
          }
        ]
      };
    }
  }
);

/**
 * 停用 access code 工具
 */
export const deactivateAccessCodeTool = tool(
  "deactivate_access_code",
  "停用 access code，将其状态设置为 inactive。这是退款操作的必要步骤，将使该 access code 无法继续使用。",
  {
    access_code: z.string().describe("需要停用的 access code"),
    reason: z.string().optional().describe("停用原因，如 'user_refund_request'")
  },
  async ({ access_code, reason = "user_refund_request" }: { access_code: string; reason?: string }) => {
    try {
      const API_BASE_URL = "https://ghibliflowstudio.com/api";
      const API_TOKEN = process.env.GHIBLI_API_TOKEN;

      // 首先获取 access code 的当前状态和使用信息
      const getResponse = await fetch(`${API_BASE_URL}/access-codes/${access_code}`, {
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

      if (!getResponse.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ 获取 access code 信息失败：API 返回 ${getResponse.status} 错误。`
            }
          ]
        };
      }

      const getData = await getResponse.json() as { success: boolean; data: any };
      if (!getData.success || !getData.data) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Access code ${access_code} 不存在或无效。`
            }
          ]
        };
      }

      const codeInfo = getData.data;
      // 默认按10次计算总次数
      const initialUses = codeInfo.initialUses || 10;
      const remainingUses = codeInfo.usesRemaining;
      const usedTimes = initialUses - remainingUses;

      // 计算退款金额（10次=5元，单价0.5元/次）
      const pricePerUse = 0.5;
      const totalPrice = initialUses * pricePerUse;
      const refundAmount = remainingUses * pricePerUse;

      // 然后执行停用操作
      const response = await fetch(`${API_BASE_URL}/access-codes/${access_code}`, {
        method: "PATCH",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Referer": "https://ghibliflowstudio.com/",
          "Origin": "https://ghibliflowstudio.com",
          "Authorization": `Bearer ${API_TOKEN}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({
          isActive: false,
          reason: reason
        })
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ 停用失败：API 返回 ${response.status} 错误。可能是 access code 不存在、权限不足或已经被停用。`
            }
          ]
        };
      }

      const data = await response.json() as { success: boolean; data?: any };

      if (!data.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ 停用失败：API 返回失败状态。`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `✅ 停用成功！
Access Code: ${access_code}
状态: 已停用 (inactive)

📊 使用情况：
- 总次数: ${initialUses} 次
- 已使用: ${usedTimes} 次
- 剩余: ${remainingUses} 次
- 可退款金额: ¥${refundAmount}

💰 退款信息：
- 总价: ¥${totalPrice}
- 已使用: ¥${usedTimes * pricePerUse}
- 可退金额: ¥${refundAmount}

停用原因: ${reason}
时间: ${new Date().toLocaleString()}

该 access code 已无法继续使用，退款操作已完成。`
          }
        ]
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ 停用过程中发生错误:", errorMessage);

      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 停用过程中发生错误: ${errorMessage}`
          }
        ]
      };
    }
  }
);
