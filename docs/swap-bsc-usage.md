# BSC 网络代币交换测试脚本使用说明

## 📋 脚本概述

这个脚本用于在 BSC（币安智能链）网络上测试实际的代币交换功能。它硬编码了将 1 个 USDT 交换为 WBNB 的完整流程，包括授权、交换和交易监控。

### 🎯 主要功能

- ✅ **人类可读单位**: 直接使用 "1" 而非原子单位（wei）
- ✅ **完整交换流程**: 报价 → 授权 → 交换 → 监控
- ✅ **BSC 网络支持**: 原生支持币安智能链
- ✅ **自动授权检查**: 智能检测是否需要代币授权
- ✅ **实时交易监控**: 跟踪交易状态直到完成
- ✅ **详细信息展示**: 汇率、Gas费、DEX路由等

## 🌐 网络信息

### BSC 网络配置
- **链名称**: Binance Smart Chain (BSC)
- **链 ID**: 56
- **RPC 端点**: https://bsc-dataseed1.binance.org/
- **区块浏览器**: https://bscscan.com/
- **OKX DEX 路由器**: `0x9b9efa5Efa731EA9Bbb0369E91fA17Abf249CFD4`

### 支持的代币
```typescript
const BSC_TOKEN_ADDRESSES = {
  BNB: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',  // 原生 BNB
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // Wrapped BNB
  USDT: '0x55d398326f99059fF775485246999027B3197955', // BSC USDT (18 位小数)
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC USDC (18 位小数)
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'  // BSC BUSD (18 位小数)
};
```

## ⚙️ 环境准备

### 1. 环境变量配置

创建或更新 `.env` 文件：

```bash
# OKX API 配置
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_API_PASSPHRASE=your_passphrase
OKX_PROJECT_ID=your_project_id

# 钱包配置 - ⚠️ 重要：需要实际的钱包私钥来签名交易
EVM_WALLET_ADDRESS=0xYourWalletAddress
EVM_PRIVATE_KEY=YourPrivateKey
```

**⚠️ 安全警告：**
- **EVM_PRIVATE_KEY** 是您钱包的私钥，具有完全控制权
- 请确保 `.env` 文件已添加到 `.gitignore` 中
- 永远不要在公共场所分享您的私钥
- 建议首次使用测试钱包和小额资金

### 2. 钱包要求

**⚠️ 重要：您的钱包必须满足以下条件：**

1. **有足够的 USDT**: 至少 1 个 USDT 用于交换
2. **有足够的 BNB**: 用于支付 Gas 费用（建议至少 0.01 BNB）
3. **私钥权限**: 脚本需要私钥来签名交易
4. **授权状态**: 首次使用需要授权 USDT 给 OKX DEX 路由器

### 3. 依赖安装

```bash
npm install web3 axios dotenv crypto-js
npm install --save-dev @types/node typescript
```

## 🚀 运行脚本

### 基本运行

```bash
npx ts-node test/swap-bsc-test.ts
```

### 预期输出示例

```
🚀 开始执行 BSC 网络代币交换
🔄 1 USDT -> WBNB
🔢 原子单位数量: 1000000000000000000

📋 步骤 1: 获取交换报价
🔍 获取交换报价: USDT -> WBNB
💰 交换数量: 1 USDT

📊 交换详情:
============================================================
🔄 交换对: USDT -> WBNB
📥 输入数量: 1 USDT
📤 预期输出: 0.002845 WBNB
💱 汇率: 1 USDT ≈ 0.002845 WBNB
🏪 可用 DEX: PancakeSwap V3, Uniswap V3, BiSwap
🎯 最佳路由: PancakeSwap V3
⛽ 预估 Gas 费: 0.000045 BNB
📈 价格影响: -0.12%
🎯 滑点设置: 0.5%
============================================================

🔐 步骤 2: 检查代币授权
❗ 需要授权代币...
📡 授权交易已提交，订单ID: xxx
📡 监控交易状态，订单ID: xxx
✅ 交易成功！
🔗 交易哈希: 0xabcd...
🌐 区块链浏览器: https://bscscan.com/tx/0xabcd...
⏳ 等待授权生效...

💱 步骤 3: 执行代币交换
📡 交换交易已提交，订单ID: yyy
📡 监控交易状态，订单ID: yyy
✅ 交易成功！
🔗 交易哈希: 0xefgh...
🌐 区块链浏览器: https://bscscan.com/tx/0xefgh...

🎉 交换完成！
💰 已将 1 USDT 交换为 WBNB

🏁 程序执行完成
```

## 🔧 关键技术特性

### 1. 人类可读单位转换

```typescript
// 配置中直接使用人类可读单位
const SWAP_CONFIG = {
  amount: '1',  // 直接写 "1 USDT"，而不是 "1000000000000000000"
  // ...
};

// 自动转换为原子单位
function toAtomicUnits(amount: string, tokenAddress: string): string {
  const decimals = 18; // BSC USDT 是 18 位小数
  const atomicAmount = BigInt(parseFloat(amount) * Math.pow(10, decimals));
  return atomicAmount.toString();
}
```

### 2. 智能授权检查

脚本会自动检查当前授权额度，只在必要时进行授权：

```typescript
const currentAllowance = await checkAllowance(SWAP_CONFIG.fromToken, WALLET_ADDRESS, routerAddress);
const requiredAmount = BigInt(atomicAmount);

if (currentAllowance < requiredAmount) {
  // 执行授权
} else {
  console.log('✅ 已有足够的代币授权');
}
```

### 3. 完整的交易生命周期

1. **获取报价**: 从 OKX DEX API 获取最佳交换路径
2. **检查授权**: 验证代币授权是否足够
3. **执行授权**: 如需要，先授权代币使用
4. **执行交换**: 发送实际的交换交易
5. **监控状态**: 实时跟踪交易直到完成

### 4. 多DEX支持

脚本通过 OKX DEX 聚合器支持多个 BSC 上的 DEX：
- PancakeSwap V3
- Uniswap V3 (BSC)
- BiSwap
- MDEX
- BabySwap
- 等等...

## ⚠️ 重要安全注意事项

### 私钥安全
- **永远不要**将私钥硬编码到代码中
- 使用 `.env` 文件并添加到 `.gitignore`
- 考虑使用测试网络进行初步测试

### 资金安全
- 首次运行建议使用小额资金测试
- 确认钱包有足够的 BNB 支付 Gas 费
- 检查代币合约地址是否正确

### 网络安全
- 使用可信的 RPC 端点
- 确保网络连接稳定
- 避免在公共网络上运行

## 🔍 故障排除

### 常见错误及解决方案

#### 1. 认证错误 (403)
```
❌ 错误: 缺少 OKX API 配置，请检查 .env 文件
```
**解决方案：**
- 检查 .env 文件中的 API 配置是否正确
- 确认 API 密钥有 DEX 权限
- 验证 IP 白名单设置

#### 2. 余额不足错误
```
❌ 交换失败: insufficient funds for gas * price + value
```
**解决方案：**
- 确保钱包有足够的 BNB 支付 Gas 费
- 确保钱包有足够的 USDT 进行交换
- 检查代币余额：`https://bscscan.com/address/您的地址`

#### 3. 授权失败
```
❌ 授权交易失败
```
**解决方案：**
- 检查代币合约地址是否正确
- 确保 Gas 费设置合理
- 等待网络确认后重试

#### 4. 交易超时
```
❌ 交易监控超时
```
**解决方案：**
- 检查网络状况
- 在区块浏览器中手动查看交易状态
- 增加 Gas Price 加快确认

### 调试技巧

#### 查看详细错误信息
在代码中添加更多日志：
```typescript
console.log('API Response:', JSON.stringify(response.data, null, 2));
```

#### 检查钱包状态
访问 BSCScan 查看：
- 代币余额
- 交易历史
- 授权状态

## 🎯 自定义配置

### 修改交换对

要测试不同的代币对，修改 `SWAP_CONFIG`：

```typescript
const SWAP_CONFIG = {
  fromToken: BSC_TOKEN_ADDRESSES.USDC,  // 改为 USDC
  toToken: BSC_TOKEN_ADDRESSES.BNB,     // 改为原生 BNB
  fromSymbol: 'USDC',
  toSymbol: 'BNB',
  amount: '5',  // 5 USDC
  slippage: '1.0'  // 增加滑点到 1%
};
```

### 调整滑点容忍度

```typescript
const SWAP_CONFIG = {
  // ...
  slippage: '1.0'  // 1% 滑点（对于波动性大的代币）
};
```

### 修改交换数量

```typescript
const SWAP_CONFIG = {
  // ...
  amount: '0.5',  // 交换 0.5 个代币
  // 或
  amount: '10',   // 交换 10 个代币
};
```

## 📊 费用说明

### Gas 费用
- **授权交易**: 通常 ~50,000 Gas (约 0.0005 BNB)
- **交换交易**: 通常 ~150,000 Gas (约 0.0015 BNB)
- **总计**: 约 0.002 BNB (根据网络拥堵情况变化)

### 交换费用
- **DEX 费用**: 通常 0.25% - 0.3%
- **价格影响**: 取决于交换数量和流动性
- **滑点损失**: 取决于设置的滑点容忍度

## 🔄 扩展功能

### 添加更多代币对

```typescript
// 添加新的代币地址
const CUSTOM_TOKEN = '0xYourTokenAddress';

// 修改配置
const SWAP_CONFIG = {
  fromToken: CUSTOM_TOKEN,
  toToken: BSC_TOKEN_ADDRESSES.WBNB,
  // ...
};
```

### 批量交换测试

```typescript
const SWAP_TESTS = [
  { from: 'USDT', to: 'WBNB', amount: '1' },
  { from: 'USDC', to: 'BNB', amount: '2' },
  { from: 'BUSD', to: 'WBNB', amount: '3' }
];

// 循环执行测试
for (const test of SWAP_TESTS) {
  await executeCustomSwap(test);
}
```

## 📈 监控和分析

### 交易成功率统计
```typescript
let successCount = 0;
let totalCount = 0;

// 在 executeSwap 函数中添加统计
totalCount++;
if (result) {
  successCount++;
}

console.log(`成功率: ${(successCount/totalCount*100).toFixed(2)}%`);
```

### 费用分析
```typescript
let totalGasFee = BigInt(0);
let totalSwapFee = BigInt(0);

// 记录每笔交易的费用
totalGasFee += BigInt(gasFee);
console.log(`累计 Gas 费: ${fromAtomicUnits(totalGasFee.toString(), BSC_TOKEN_ADDRESSES.BNB)} BNB`);
```

## 🏆 最佳实践

1. **测试优先**: 先在测试网或小额资金上验证
2. **监控网络**: 关注 BSC 网络状况和 Gas 价格
3. **合理滑点**: 根据市场波动性设置合适的滑点
4. **分批执行**: 大额交换考虑分批进行
5. **保留记录**: 记录所有交易哈希以备查询

## 🆘 技术支持

如遇到问题，请检查：

1. **环境配置**: API 密钥、钱包地址、私钥
2. **网络连接**: BSC RPC 端点访问
3. **余额状态**: BNB 和代币余额
4. **API 状态**: OKX DEX API 服务状态

---

**提示**: 这个脚本为您的 DeFi 应用提供了完整的代币交换功能基础。您可以基于此脚本扩展更多功能，如套利机器人、流动性管理等高级应用。 