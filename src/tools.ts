import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { checkAccessCodeRefund } from "./services";

/**
 * Access Code 退款资格检查工具
 *
 * 该工具专门负责检查 access code 的退款资格：
 * - 从 GhibliFlowStudio 链接中提取 access code
 * - 调用生产环境 API 获取 access code 信息
 * - 根据使用情况和状态判断退款资格
 * - 计算退款比例并提供详细报告
 */
export function initTools() {
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
}
