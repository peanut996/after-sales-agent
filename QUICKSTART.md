# 快速开始指南

## 运行Agent

```bash
# 开发模式（推荐）
npm run dev

# 或构建后运行
npm run build
npm start
```

## 使用示例

启动后，在terminal中直接粘贴链接：

```
客服助手> https://ghibliflowstudio.com/?c=c0507bd820
```

系统会：
1. ✅ 自动提取 access code: `c0507bd820`
2. 🔍 查询 API 获取详细信息
3. 📊 分析退款资格
4. 💰 返回退款比例和建议

## 退出程序

```
客服助手> exit
```

或

```
客服助手> quit
```

## 核心功能

- **URL解析**：自动从链接中提取 `?c=` 参数
- **API调用**：查询 GhibliFlowStudio API
- **资格判断**：基于使用次数和状态判断是否可退款
- **详细报告**：提供完整的分析结果和退款比例

## 下一步

现在需要实现：
1. 集成真实的 GhibliFlowStudio API 认证
2. 完善退款比例计算逻辑（根据实际使用次数）
3. 添加数据缓存和错误重试机制
