# 快速开始指南

本指南将帮助您在5分钟内开始使用 OKX DEX API 交易程序。

## 🚀 第一步：环境准备

### 1. 安装依赖

```bash
cd okx_dex_api
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp env.example .env
```

编辑 `.env` 文件：

```bash
# 必填：OKX API 配置
OKX_API_KEY=your_api_key_here
OKX_SECRET_KEY=your_secret_key_here
OKX_API_PASSPHRASE=your_passphrase_here
OKX_PROJECT_ID=your_project_id_here

# 必填：钱包配置
EVM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your_key
EVM_WALLET_ADDRESS=0xYourWalletAddress
EVM_PRIVATE_KEY=YourPrivateKeyWithout0xPrefix

# 可选：网络配置
CHAIN_ID=1
```

## 📋 第二步：获取 API 密钥

### OKX API 密钥申请

1. 访问 [OKX Web3 开发者平台](https://web3.okx.com/build/docs/waas/introduction)
2. 注册并完成身份验证
3. 创建新的 API 应用
4. 记录以下信息：
   - API Key
   - Secret Key
   - Passphrase
   - Project ID

### RPC 节点获取

推荐的 RPC 提供商：

- **Alchemy**: https://alchemy.com
- **Infura**: https://infura.io
- **QuickNode**: https://quicknode.com

获取 RPC URL 示例：
- 以太坊主网：`https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY`
- Base 网络：`https://base-mainnet.alchemyapi.io/v2/YOUR_KEY`

## 🔧 第三步：运行测试

### 基础功能测试

```bash
npm test
```

测试内容包括：
- ✅ 客户端创建
- ✅ 网络连接检查
- ✅ API 接口调用
- ✅ 配置验证

### 示例输出

```
🚀 开始 OKX DEX API 基础测试...

📋 测试1: 创建客户端实例
✅ 客户端创建成功

📋 测试2: 检查网络连接
✅ 网络连接状态: 已连接

📋 测试3: 获取支持的链列表
✅ 支持的链数量: 15

📋 测试4: 获取支持的代币列表
✅ 支持的代币数量: 1250

📋 测试5: 获取账户余额
✅ ETH 余额: 0.1 ETH

📋 测试6: 获取交易报价
✅ 获取报价成功
从 ETH 到 USDC
输入数量: 1000000000000000
预期输出: 3342
```

## 💰 第四步：第一次交易

### 使用代码执行交易

创建交易脚本 `my-first-swap.ts`：

```typescript
import { createOKXDEXClient } from './src';

async function firstSwap() {
  // 创建客户端
  const client = createOKXDEXClient();

  // 检查连接
  const isConnected = await client.checkConnection();
  if (!isConnected) {
    throw new Error('网络连接失败');
  }

  // 交易参数
  const swapParams = {
    fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
    toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',   // USDC
    amount: '1000000000000000',  // 0.001 ETH
    slippage: '0.5'              // 0.5% 滑点
  };

  console.log('🔍 获取报价...');
  const quote = await client.getQuote(swapParams);
  console.log(`报价: ${quote.fromTokenAmount} ${quote.fromToken.tokenSymbol} → ${quote.toTokenAmount} ${quote.toToken.tokenSymbol}`);
  console.log(`价格影响: ${quote.priceImpactPercentage}%`);

  console.log('🚀 执行交换...');
  const result = await client.swap(swapParams);
  
  if (result.success) {
    console.log(`✅ 交换成功!`);
    console.log(`交易哈希: ${result.txHash}`);
    console.log(`订单ID: ${result.orderId}`);
  } else {
    console.log(`❌ 交换失败: ${result.error}`);
  }
}

firstSwap().catch(console.error);
```

运行交易：

```bash
npx ts-node my-first-swap.ts
```

### 使用 Web 界面

启动 Web 服务：

```bash
npm run web
```

访问 `http://localhost:3000`：

1. **设置钱包配置**：填入钱包地址和私钥
2. **查看账户信息**：确认余额和连接状态
3. **获取报价**：选择代币对并输入数量
4. **执行交换**：确认参数后执行交易
5. **追踪交易**：使用订单ID追踪交易状态

## 🔧 常用代币地址

### 以太坊主网 (Chain ID: 1)

```javascript
const TOKENS = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
};
```

### Base 网络 (Chain ID: 8453)

```javascript
const BASE_TOKENS = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  WETH: '0x4200000000000000000000000000000000000006'
};
```

## 💡 数量计算

代币数量需要转换为最小单位：

```typescript
// ETH (18 精度)
// 0.001 ETH = 0.001 × 10^18 = 1000000000000000
const ethAmount = '1000000000000000';

// USDC (6 精度)  
// 1000 USDC = 1000 × 10^6 = 1000000000
const usdcAmount = '1000000000';

// 通用公式
function toBaseUnits(amount: number, decimals: number): string {
  return (amount * Math.pow(10, decimals)).toString();
}
```

## 📞 遇到问题？

### 常见错误及解决方案

1. **"缺少必需的环境变量"**
   - 检查 `.env` 文件是否存在
   - 确认所有必需的环境变量都已填写

2. **"网络连接失败"**
   - 检查 RPC URL 是否正确
   - 确认网络连接正常

3. **"OKX API 错误"**
   - 验证 API 密钥是否正确
   - 检查 API 密钥权限设置

4. **"交易失败"**
   - 确认钱包有足够的 ETH 作为 Gas 费
   - 检查代币余额是否充足
   - 调整滑点设置

### 获取帮助

- 📖 查看完整文档：`docs/README.md`
- 🔍 检查代码示例：`test/basic-test.ts`
- 🌐 使用 Web 界面调试：`npm run web`

## 🎉 下一步

现在您已经成功运行了第一笔交易！可以探索更多功能：

- 🔄 自动化交易策略
- 🌐 多链支持
- 📊 集成到您的应用程序
- 🤖 构建交易机器人

祝您交易愉快！ 🚀 