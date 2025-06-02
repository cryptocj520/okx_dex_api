# BSC 网络代币交换项目

## 🎯 项目概述

这是一个基于 OKX DEX API 的 BSC（币安智能链）网络代币交换完整解决方案。项目包含了从简单报价查询到完整交换执行的全套功能，使用人类可读的数量单位，大大简化了 DeFi 开发。

### 🌟 项目特色

- ✅ **人类可读单位**: 直接使用 "1 USDT" 而不是 "1000000000000000000"
- ✅ **完整交换流程**: 报价 → 授权 → 交换 → 监控
- ✅ **安全性优先**: 详细的安全提示和错误处理
- ✅ **生产就绪**: 基于 OKX DEX 生产 API 构建
- ✅ **多DEX聚合**: 自动选择最佳交换路径
- ✅ **实时监控**: 交易状态跟踪直到完成

## 📁 项目结构

```
test/
├── quote-bsc-test.ts          # BSC 报价测试脚本（无需私钥）⭐
├── swap-bsc-test.ts           # BSC 完整交换脚本（需要私钥）⭐
├── quote-test-improved.ts     # Base 网络报价测试（参考）
└── debug-auth.ts              # API 认证调试工具

docs/
├── bsc-swap-project.md        # 项目综合说明（本文档）
├── swap-bsc-usage.md          # BSC 交换脚本详细使用说明
├── quote-test-summary.md      # Base 网络测试总结
└── quote-test-usage.md        # 报价测试使用说明
```

## 🚀 快速开始

### 1. 环境配置

创建 `.env` 文件：

```bash
# OKX API 配置
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_API_PASSPHRASE=your_passphrase
OKX_PROJECT_ID=your_project_id

# 钱包配置
EVM_WALLET_ADDRESS=0xYourWalletAddress
EVM_PRIVATE_KEY=YourPrivateKey  # 仅交换脚本需要
```

### 2. 安装依赖

```bash
npm install web3 axios dotenv crypto-js
npm install --save-dev @types/node typescript
```

### 3. 运行测试

#### 报价测试（推荐先运行）
```bash
# 安全的报价测试，无需私钥
npx ts-node test/quote-bsc-test.ts
```

#### 完整交换测试
```bash
# 需要私钥的完整交换，请先确保钱包有足够资金
npx ts-node test/swap-bsc-test.ts
```

## 🛠️ 核心功能

### 1. 报价查询 (`quote-bsc-test.ts`)

**功能特点：**
- 🔍 多个代币对同时测试
- 📊 详细的报价信息展示
- 🏪 DEX 路由和费用分析
- 🛡️ 无需私钥，安全测试

**测试用例：**
- 1 USDT → WBNB
- 0.01 WBNB → USDT  
- 10 USDC → WBNB

**示例输出：**
```
🧪 测试 1/3: USDT -> WBNB

📊 报价详情:
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
✅ 测试 1 通过
```

### 2. 完整交换 (`swap-bsc-test.ts`)

**功能特点：**
- 💱 端到端交换执行
- 🔐 智能授权检查
- 📡 实时交易监控
- 🎯 硬编码 1 USDT → WBNB

**交换流程：**
1. **报价获取**: 查询最佳交换路径
2. **授权检查**: 验证代币授权状态
3. **授权执行**: 如需要，先授权代币
4. **交换执行**: 发送实际交换交易
5. **状态监控**: 跟踪交易直到完成

**预期输出：**
```
🚀 开始执行 BSC 网络代币交换
🔄 1 USDT -> WBNB

📋 步骤 1: 获取交换报价
📊 交换详情显示...

🔐 步骤 2: 检查代币授权
✅ 已有足够的代币授权

💱 步骤 3: 执行代币交换
📡 交换交易已提交，订单ID: xxx

📡 步骤 4: 监控交易状态
✅ 交易成功！
🔗 交易哈希: 0xabcd...
🌐 区块链浏览器: https://bscscan.com/tx/0xabcd...

🎉 交换完成！
💰 已将 1 USDT 交换为 WBNB
```

## 🌐 网络和代币支持

### BSC 网络配置
- **链名称**: Binance Smart Chain (BSC)
- **链 ID**: 56
- **RPC 端点**: https://bsc-dataseed1.binance.org/
- **区块浏览器**: https://bscscan.com/
- **OKX DEX 路由器**: `0x9b9efa5Efa731EA9Bbb0369E91fA17Abf249CFD4`

### 支持的代币
| 代币 | 符号 | 合约地址 | 小数位 |
|------|------|----------|--------|
| Binance Coin | BNB | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` | 18 |
| Wrapped BNB | WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | 18 |
| Tether USD | USDT | `0x55d398326f99059fF775485246999027B3197955` | 18 |
| USD Coin | USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | 18 |
| Binance USD | BUSD | `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56` | 18 |

### 支持的DEX
通过 OKX DEX 聚合器支持：
- PancakeSwap V2/V3
- Uniswap V3 (BSC)
- BiSwap
- MDEX
- BabySwap
- ApeSwap
- 等多个DEX...

## 💡 关键技术实现

### 1. 人类可读单位转换

```typescript
// 简单配置，直接使用人类理解的数量
const SWAP_CONFIG = {
  amount: '1',  // 1 USDT，而不是 1000000000000000000
  fromSymbol: 'USDT',
  toSymbol: 'WBNB'
};

// 自动转换为区块链原子单位
function toAtomicUnits(amount: string, tokenAddress: string): string {
  const decimals = 18; // BSC 代币通常 18 位小数
  const atomicAmount = BigInt(parseFloat(amount) * Math.pow(10, decimals));
  return atomicAmount.toString();
}
```

### 2. 智能授权管理

```typescript
// 检查当前授权额度
const currentAllowance = await checkAllowance(tokenAddress, userAddress, routerAddress);
const requiredAmount = BigInt(atomicAmount);

// 只在必要时授权
if (currentAllowance < requiredAmount) {
  console.log('需要授权代币...');
  await executeApproval();
} else {
  console.log('已有足够授权');
}
```

### 3. 实时交易监控

```typescript
// 持续监控交易状态
async function trackTransaction(orderId: string): Promise<any> {
  while (attempts < maxAttempts) {
    const status = await checkTransactionStatus(orderId);
    
    if (status === '2') {
      console.log('✅ 交易成功！');
      return txData;
    } else if (status === '3') {
      throw new Error('❌ 交易失败');
    }
    
    await delay(5000); // 每5秒检查一次
  }
}
```

## ⚠️ 安全注意事项

### 🔐 私钥安全
1. **永远不要**硬编码私钥到代码中
2. 使用 `.env` 文件并添加到 `.gitignore`
3. 建议首次使用测试钱包
4. 考虑使用硬件钱包或多签钱包

### 💰 资金安全
1. **小额测试**: 首次运行使用小额资金
2. **余额检查**: 确保钱包有足够的 BNB 支付 Gas
3. **合约验证**: 确认代币合约地址正确
4. **滑点设置**: 根据市场波动设置合理滑点

### 🌐 网络安全
1. **RPC 选择**: 使用可信的 RPC 端点
2. **网络稳定**: 确保网络连接稳定
3. **公网警告**: 避免在公共网络运行

## 🔧 自定义和扩展

### 修改交换对

```typescript
const SWAP_CONFIG = {
  fromToken: BSC_TOKEN_ADDRESSES.USDC,  // 改为 USDC
  toToken: BSC_TOKEN_ADDRESSES.BNB,     // 改为原生 BNB
  fromSymbol: 'USDC',
  toSymbol: 'BNB',
  amount: '5',      // 5 USDC
  slippage: '1.0'   // 1% 滑点
};
```

### 添加新的代币

```typescript
const CUSTOM_TOKEN_ADDRESSES = {
  ...BSC_TOKEN_ADDRESSES,
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // PancakeSwap
  UNI: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1'   // Uniswap
};
```

### 批量交换测试

```typescript
const SWAP_TESTS = [
  { from: 'USDT', to: 'WBNB', amount: '1' },
  { from: 'USDC', to: 'BNB', amount: '2' },
  { from: 'BUSD', to: 'WBNB', amount: '3' }
];

for (const test of SWAP_TESTS) {
  await executeSwap(test);
  await delay(30000); // 30秒间隔
}
```

## 📊 成本分析

### Gas 费用估算
- **授权交易**: ~50,000 Gas (约 0.0005 BNB)
- **交换交易**: ~150,000 Gas (约 0.0015 BNB)
- **总计**: 约 0.002 BNB (按当前 Gas 价格)

### 交换费用
- **DEX 费用**: 0.25% - 0.3%
- **价格影响**: 取决于交换数量和流动性
- **滑点损失**: 取决于设置的滑点容忍度

### 费用优化建议
1. **合并操作**: 减少授权次数
2. **Gas 优化**: 选择网络较空闲时段
3. **数量控制**: 避免过大交换影响价格
4. **DEX 比较**: 利用聚合器找最佳价格

## 🔍 故障排除

### 常见错误类型

#### 1. 认证错误 (403)
```
解决方案：
- 检查 API 密钥配置
- 验证 IP 白名单
- 确认 API 权限
```

#### 2. 余额不足
```
解决方案：
- 检查 USDT 余额
- 确保有足够 BNB 支付 Gas
- 查看 BSCScan 确认余额
```

#### 3. 授权失败
```
解决方案：
- 检查代币合约地址
- 增加 Gas limit
- 等待网络确认
```

#### 4. 交易超时
```
解决方案：
- 检查网络状况
- 增加 Gas price
- 手动查询交易状态
```

### 调试工具

#### 查看 API 响应
```typescript
console.log('API Response:', JSON.stringify(response.data, null, 2));
```

#### 监控钱包状态
- BSCScan: https://bscscan.com/address/你的地址
- 查看代币余额、交易历史、授权状态

#### 测试 API 连接
```bash
npx ts-node test/debug-auth.ts
```

## 📈 性能监控

### 成功率统计
```typescript
let stats = {
  total: 0,
  success: 0,
  failed: 0,
  avgGasFee: 0,
  avgExecutionTime: 0
};

// 记录每次交换结果
stats.total++;
if (result.success) {
  stats.success++;
} else {
  stats.failed++;
}

console.log(`成功率: ${(stats.success/stats.total*100).toFixed(2)}%`);
```

### 费用分析
```typescript
let totalCosts = {
  gasFee: BigInt(0),
  swapFee: BigInt(0),
  priceImpact: 0
};

// 累计费用统计
totalCosts.gasFee += BigInt(gasFee);
console.log(`累计 Gas 费: ${fromAtomicUnits(totalCosts.gasFee.toString(), BNB_ADDRESS)} BNB`);
```

## 🎯 生产环境部署

### 环境变量管理
```bash
# 生产环境配置
NODE_ENV=production
OKX_API_KEY=prod_api_key
LOG_LEVEL=info
MAX_SLIPPAGE=1.0
```

### 错误处理和重试
```typescript
async function executeWithRetry(operation: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000); // 指数退避
    }
  }
}
```

### 监控和告警
```typescript
// 集成监控服务
if (swapResult.failed) {
  await sendAlert('Swap Failed', {
    txHash: result.txHash,
    error: result.error,
    timestamp: new Date().toISOString()
  });
}
```

## 🏆 最佳实践总结

### 开发阶段
1. **先测试报价**: 使用 `quote-bsc-test.ts` 验证 API 连接
2. **小额验证**: 用小量资金测试完整流程
3. **错误处理**: 充分测试各种错误场景
4. **日志记录**: 保留详细的执行日志

### 生产部署
1. **环境隔离**: 开发、测试、生产环境分离
2. **密钥管理**: 使用专业的密钥管理服务
3. **监控告警**: 实时监控交易状态和成功率
4. **备份策略**: 多个 RPC 端点备用

### 风险控制
1. **金额限制**: 设置单笔和日总交换限额
2. **滑点保护**: 合理设置滑点容忍度
3. **时间窗口**: 避免在网络拥堵时段交换
4. **应急预案**: 准备交易回滚和资金恢复方案

---

## 📝 附录

### 相关文档
- [BSC 交换脚本详细使用说明](./swap-bsc-usage.md)
- [Base 网络测试总结](./quote-test-summary.md)
- [OKX DEX API 官方文档](https://web3.okx.com/build/dev-docs/dex-api)

### 技术支持
如遇到问题，请检查：
1. **环境配置**: API 密钥和钱包设置
2. **网络状态**: BSC 网络和 RPC 连接
3. **资金状况**: BNB 和代币余额
4. **合约地址**: 确认代币地址正确

### 社区资源
- BSC 官方文档: https://docs.bnbchain.org/
- PancakeSwap: https://pancakeswap.finance/
- OKX Web3: https://web3.okx.com/

---

**⚡ 提示**: 这个项目为您的 DeFi 应用开发提供了完整的代币交换基础架构。您可以基于这些脚本构建更复杂的应用，如套利机器人、流动性管理工具或自动化投资策略。 