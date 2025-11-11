# Access Code 退款资格检查 Agent

基于 Claude Agent SDK 开发的智能Access Code退款资格检查系统。

## 功能特性

- 🔍 **Access Code检查**：自动从GhibliFlowStudio链接中提取access code
- 💰 **退款资格判断**：根据使用次数和状态判断是否可退款
- 💬 **终端聊天模式**：支持在terminal中直接输入链接进行检查
- 📊 **详细报告**：提供完整的退款比例和原因分析

## 项目结构

```
after-sales-agent/
├── src/
│   └── index.ts          # Agent 主体代码
├── package.json          # 项目依赖配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目说明文档
```

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run dev
```

## 构建项目

```bash
npm run build
```

## 启动项目

```bash
npm start
```

## 使用方法

### 启动Terminal聊天模式

```bash
npm run dev
```

或者

```bash
npm start
```

### 在Terminal中使用

1. 启动程序后，会看到提示符 `客服助手>`
2. 直接粘贴 GhibliFlowStudio 链接，例如：
   ```
   客服助手> https://ghibliflowstudio.com/?c=c0507bd820
   ```
3. 系统会自动提取 access code 并进行查询
4. 查看退款资格和比例信息
5. 输入 `exit` 或 `quit` 退出程序

## 可用工具

### check_access_code_refund
检查 access code 退款资格
- 参数：access_code（字符串）
- 返回：详细的退款资格报告，包括：
  - Access Code
  - 产品描述
  - 剩余使用次数
  - 激活状态
  - 处理模式
  - 退款资格（符合/不符合）
  - 退款比例
  - 退款原因

## 输出示例

### 成功示例
```
=== Access Code 退款资格检查 Agent ===
已启动终端聊天模式
请粘贴 GhibliFlowStudio 链接进行检查
输入 'exit' 或 'quit' 退出程序

客服助手> https://ghibliflowstudio.com/?c=c0507bd820

✅ 检查完成！
📋 检查结果:
   - Access Code: c0507bd820
   - 描述: GhibliFlow Studio Pro - 10次使用
   - 剩余次数: 10
   - 状态: 激活
   - 处理模式: automatic
   - 退款资格: ✅ 符合
   - 退款比例: 100%
   - 原因: Access code 完全未使用，可全额退款
```

### 失败示例
```
❌ 检查失败！
   - 原因: 该 access code 在系统中未找到
```

## 后续开发

1. ✅ 自动从URL提取access code
2. ✅ Terminal聊天模式
3. 🔄 集成GhibliFlowStudio生产环境API
4. 📊 增强退款比例计算逻辑（基于实际使用次数）
5. 🔐 添加API认证机制
6. 📝 添加详细日志记录
7. 🧪 添加单元测试
8. 💾 实现数据缓存机制
9. 🔄 添加错误处理和重试机制
10. 📈 添加使用统计和报告功能

## 许可证

ISC
