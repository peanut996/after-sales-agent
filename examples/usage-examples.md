# After-Sales Agent 使用示例

## 启动方式

### 1. 直接查询模式
```bash
npm run dev -- ABC12345
```
直接查询指定的 access code。

### 2. 交互式对话模式
```bash
npm run dev -- --chat
```
启动交互式命令行界面，支持多轮对话。

### 3. SDK 查询模式
```bash
npm run dev -- --query
```
使用 Claude Agent SDK 的查询功能进行智能交互。

## 使用示例

### 对话模式示例
```
👤 您: 我想检查退款资格
🤖 助手: 请提供您的 access code 或相关问题，我会尽力帮助您。

👤 您: 我的 access code 是 ABC12345
🔍 检测到 access code: ABC12345
⏳ 正在检查退款资格...

✅ 退款资格检查结果：

📋 详细信息：
• Access Code: ABC12345
• 描述: GhibliFlow Studio 会员码
• 剩余次数: 10
• 状态: ✅ 激活
• 处理模式: unlimited

💰 退款资格: ✅ 符合退款条件
🔄 退款比例: 100%
📝 原因: Access code 完全未使用，可全额退款

您可以申请退款，请联系客服处理。
```

### SDK 查询模式示例
```
👤 您: 请帮我检查 XYZ7890 是否可以退款

🤖 Claude Agent 正在处理...

🤖 Claude Agent: 我正在帮您检查 access code XYZ7890 的退款资格...

🔍 正在检查 access code: XYZ7890...
✅ 检查完成！
📋 检查结果:
   - Access Code: XYZ7890
   - 描述: GhibliFlow Studio 试用码
   - 剩余次数: 5
   - 状态: 激活
   - 处理模式: standard
   - 退款资格: ✅ 符合
   - 退款比例: 100%
   - 原因: Access code 完全未使用，可全额退款

您可以申请全额退款。
```

## 功能特点

1. **多种查询方式**
   - 命令行直接查询
   - 交互式对话
   - SDK 智能查询

2. **安全钩子**
   - 防止访问系统敏感文件
   - 限制文件操作范围
   - 安全的工具调用

3. **完整信息返回**
   - Access code 状态
   - 剩余使用次数
   - 退款资格判断
   - 退款比例计算

4. **中文界面**
   - 完整的中文提示
   - 友好的用户交互
   - 清晰的错误提示
