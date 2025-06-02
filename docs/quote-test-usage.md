# OKX DEX 报价测试脚本使用说明

## 概述

这个测试脚本用于测试 OKX DEX API 的报价功能，可以获取不同代币对的交换报价并验证数据的正确性。

## 功能特性

### 🎯 核心功能
- **多代币对测试**: 支持 ETH、USDC、DAI、USDT 等主流代币
- **报价详情显示**: 显示输入输出数量、汇率、使用的DEX、Gas费用等
- **滑点测试**: 测试不同滑点设置下的报价差异
- **数量级测试**: 测试小额到大额不同数量级的报价

### 📊 测试项目
1. **基础代币对测试**
   - ETH -> USDC
   - USDC -> ETH  
   - ETH -> DAI
   - USDC -> USDT

2. **滑点变化测试**
   - 0.1%, 0.5%, 1.0%, 3.0% 滑点对比

3. **数量级变化测试**
   - 小额: 0.0001 ETH
   - 中等: 0.001 ETH
   - 大额: 0.01 ETH
   - 超大额: 0.1 ETH

## 环境准备

### 1. 环境变量配置

确保您的 `.env` 文件包含以下配置：

```bash
# OKX API 配置
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_API_PASSPHRASE=your_passphrase
OKX_PROJECT_ID=your_project_id

# 钱包地址
EVM_WALLET_ADDRESS=0xYourWalletAddress
```

### 2. 依赖安装

```bash
npm install web3 axios dotenv crypto-js
npm install --save-dev @types/node typescript
```

## 运行测试

### 方式一: 直接运行
```bash
npx ts-node test/quote-test.ts
```

### 方式二: 编译后运行
```bash
npx tsc test/quote-test.ts
node test/quote-test.js
```

## 输出示例

```
🚀 开始 OKX DEX 报价测试
============================================================

🧪 ETH -> USDC 交换报价
🔍 获取报价: ETH -> USDC
💰 数量: 0.001

📊 报价详情:
──────────────────────────────────────────────────────
🔄 交换对: ETH -> USDC
📥 输入数量: 0.001 ETH
📤 预期输出: 2.45 USDC
💱 汇率: 1 ETH ≈ 2450.123456 USDC
🏪 使用的 DEX: Uniswap V3, Curve
⛽ 预估 Gas 费: 0.001234 ETH
──────────────────────────────────────────────────────
✅ 测试通过

🎯 测试不同滑点设置
============================================================

📊 滑点: 0.1%
💰 输出数量: 2.451 USDC
⛽ Gas 费: 0.001234 ETH

📊 滑点: 0.5%
💰 输出数量: 2.445 USDC
⛽ Gas 费: 0.001234 ETH

📋 测试结果总结
============================================================
✅ 通过: 4/4 个基础测试
📊 完成滑点变化测试
💰 完成数量级变化测试

🎉 所有基础测试都通过了！
```

## 代码结构

### 主要函数

- `getSwapQuote()`: 获取交换报价的核心函数
- `getHeaders()`: 生成 OKX API 认证头
- `formatTokenAmount()`: 格式化代币数量显示
- `displayQuoteDetails()`: 显示详细的报价信息
- `testTokenPairQuote()`: 测试单个代币对
- `testSlippageVariations()`: 测试滑点变化
- `testAmountVariations()`: 测试数量级变化
- `runQuoteTests()`: 主测试函数

### 配置参数

```typescript
// 代币地址 (Base 链)
const TOKEN_ADDRESSES = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  WETH: '0x4200000000000000000000000000000000000006',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
};

// 测试金额
const TEST_AMOUNTS = {
  SMALL: '100000000000000',      // 0.0001 ETH
  MEDIUM: '1000000000000000',    // 0.001 ETH
  LARGE: '10000000000000000',    // 0.01 ETH
  VERY_LARGE: '100000000000000000' // 0.1 ETH
};
```

## 错误处理

脚本包含完善的错误处理机制：

- ✅ 环境变量检查
- ✅ API 响应验证
- ✅ 报价数据验证
- ✅ 网络错误处理
- ✅ 限速处理（请求间延迟）

## 注意事项

1. **API 限制**: 脚本包含请求间延迟避免触发限速
2. **网络环境**: 确保网络连接稳定，能访问 OKX API
3. **钱包地址**: 虽然只是查询报价，但需要提供有效的钱包地址
4. **代币精度**: 脚本会自动处理不同代币的小数位差异

## 扩展使用

### 添加新的代币测试

```typescript
// 在 TOKEN_ADDRESSES 中添加新代币
const TOKEN_ADDRESSES = {
  // ... 现有代币
  NEW_TOKEN: '0xNewTokenAddress'
};

// 在测试中使用
await testTokenPairQuote(
  TOKEN_ADDRESSES.ETH,
  TOKEN_ADDRESSES.NEW_TOKEN,
  TEST_AMOUNTS.MEDIUM,
  'ETH -> NEW_TOKEN 交换报价'
);
```

### 自定义测试参数

```typescript
// 自定义滑点测试
const customSlippages = ['0.05', '0.2', '2.0', '5.0'];

// 自定义数量测试
const customAmount = '5000000000000000'; // 0.005 ETH
```

## 问题排查

如果遇到测试失败，请检查：

1. 环境变量是否正确配置
2. 网络连接是否正常
3. OKX API 凭证是否有效
4. 是否触发了 API 限速

## 技术支持

如果遇到问题，请检查：
- OKX API 文档
- 错误日志输出
- 网络连接状态 