import dotenv from "dotenv";
import type { AccessCodeInfo, CheckResult } from "./types";

// 加载环境变量
dotenv.config();

/**
 * API 基础 URL
 */
const API_BASE_URL = "https://ghibliflowstudio.com/api";

/**
 * API Token
 */
const API_TOKEN = process.env.GHIBLI_API_TOKEN;

/**
 * 获取 access code 信息
 * @param code Access code
 * @returns Access code 信息或 null
 */
export async function fetchAccessCodeInfo(code: string): Promise<AccessCodeInfo | null> {
  try {
    console.log(`\n🔍 正在查询 access code: ${code}`);
    console.log(`📡 API 请求地址: ${API_BASE_URL}/access-codes/${code}`);
    console.log(`🔑 使用 API Token: ${API_TOKEN ? `${API_TOKEN.substring(0, 10)}...` : '未设置'}`);

    const response = await fetch(`${API_BASE_URL}/access-codes/${code}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "User-Agent": "AfterSalesAgent/1.0.0"
      }
    });

    // 检查响应状态
    if (!response.ok) {
      console.error(`❌ API 请求失败: ${response.status} ${response.statusText}`);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.error('⚠️  服务器返回了 HTML 页面而不是 JSON，可能是:');
        console.error('   - API 端点不存在或已更改');
        console.error('   - 代理服务器阻止了请求');
        console.error('   - 需要额外的认证或配置');
      }
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error(`⚠️  响应类型错误: ${contentType}`);
      return null;
    }

    let data: { success: boolean; data: AccessCodeInfo };
    try {
      data = await response.json() as { success: boolean; data: AccessCodeInfo };
    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError);
      return null;
    }

    console.log(`📊 响应内容:`, JSON.stringify(data, null, 2));

    if (!data.success) {
      console.log(`❌ API 返回失败: ${data}`);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error(`\n❌ 获取 access code ${code} 信息失败:`);
    console.error(`错误类型: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`错误信息: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`错误堆栈:\n${error.stack}`);
    }
    return null;
  }
}

/**
 * 更新 access code 状态
 * @param code Access code
 * @param isActive 是否激活
 * @returns 更新是否成功
 */
export async function updateAccessCodeStatus(code: string, isActive: boolean): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/access-codes/${code}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive })
    });

    const data = await response.json() as { success: boolean };

    if (!data.success) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`更新 access code ${code} 状态失败:`, error);
    return false;
  }
}

/**
 * 检查 access code 退款资格
 * @param accessCode Access code
 * @returns 退款检查结果
 */
export async function checkAccessCodeRefund(accessCode: string): Promise<CheckResult> {
  const codeInfo = await fetchAccessCodeInfo(accessCode);

  if (!codeInfo) {
    const errorResult = {
      success: false,
      message: "Access code 不存在",
      eligible: false,
      refundPercentage: 0,
      reason: "该 access code 在系统中未找到"
    };

    console.log(`\n❌ 查询结果:`);
    console.log(`   状态: ${errorResult.message}`);
    console.log(`   原因: ${errorResult.reason}`);
    console.log(`   完整结果:`, JSON.stringify(errorResult, null, 2));
    console.log(`\n💡 可能的原因:`);
    console.log(`   1. Access code 输入错误`);
    console.log(`   2. Access code 已被删除或过期`);
    console.log(`   3. API Token 配置错误或权限不足`);
    console.log(`   4. 网络连接问题`);
    console.log(`   5. API 服务暂时不可用`);

    return errorResult;
  }

  // 构建详细结果
  const result: CheckResult = {
    success: true,
    code: codeInfo.code,
    initialUses: codeInfo.usesRemaining,
    remainingUses: codeInfo.usesRemaining,
    isActive: codeInfo.isActive,
    processingMode: codeInfo.processingMode,
    eligible: false,
    refundPercentage: 0,
    reason: ""
  };

  // 只检查剩余次数是否为 10、20 或 100（不检查 status，因为只有管理员能修改）
  const validRefundAmounts = [10, 20, 100];
  if (!validRefundAmounts.includes(codeInfo.usesRemaining)) {
    result.reason = `Access code 剩余次数为 ${codeInfo.usesRemaining}，不在退款范围内。退款范围：10、20、100次`;
    return result;
  }

  // 符合退款条件
  result.eligible = true;
  result.refundPercentage = 100;
  result.reason = "Access code 剩余次数符合退款条件，可全额退款";

  return result;
}
