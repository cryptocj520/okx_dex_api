# OKX DEX API 交易程序

一个简洁、易用的 OKX DEX 交易程序，支持 EVM 链的去中心化交易。提供高级封装的 API 接口，可用于外部程序集成或独立使用。

## 🚀 特性

- **简洁的 API**: 高度封装的接口，降低使用门槛
- **模块化架构**: 清晰的代码结构，易于维护和扩展
- **多种使用方式**: 支持环境变量配置、动态配置、外部程序调用
- **Web 界面**: 提供简洁的 Web 前端进行交易操作
- **完整的错误处理**: 详细的错误信息和异常处理
- **交易监控**: 实时追踪交易状态
- **支持多链**: 以太坊、Base、BSC、Polygon 等主流 EVM 链

## 📦 安装

```bash
# 克隆项目
git clone <repository-url>
cd okx_dex_api

# 安装依赖
npm install

# 构建项目
npm run build
```

## 🔧 配置

### 环境变量配置

复制 `env.example` 为 `.env` 并填入您的配置：

```bash
# OKX API 配置
OKX_API_KEY=your_api_key_here
OKX_SECRET_KEY=your_secret_key_here
OKX_API_PASSPHRASE=your_passphrase_here
OKX_PROJECT_ID=your_project_id_here

# EVM 网络配置
EVM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your_key
EVM_WALLET_ADDRESS=0xYourWalletAddress
EVM_PRIVATE_KEY=YourPrivateKeyWithout0xPrefix

# 可选配置
CHAIN_ID=1  # 1=以太坊主网, 8453=Base, 56=BSC
```

### 获取 OKX API 密钥

1. 访问 [OKX Developer Portal](https://web3.okx.com/build/docs/waas/introduction)
2. 创建账户并完成 KYC 验证
3. 申请 API 密钥
4. 获取 API Key、Secret Key、Passphrase 和 Project ID

## 💻 使用方法

### 1. 基础用法（推荐）

```typescript
import { createOKXDEXClient } from './src';

// 使用环境变量配置
const client = createOKXDEXClient();

// 获取报价
const quote = await client.getQuote({
  fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
  toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',   // USDC
  amount: '1000000000000000', // 0.001 ETH
  slippage: '0.5'
});

// 执行交换
const result = await client.swap({
  fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  amount: '1000000000000000',
  slippage: '0.5'
});

console.log('交换结果:', result);
```

### 2. 自定义配置

```typescript
import { createOKXDEXClient } from './src';

const client = createOKXDEXClient({
  okx: {
    apiKey: 'your_api_key',
    secretKey: 'your_secret_key',
    apiPassphrase: 'your_passphrase',
    projectId: 'your_project_id'
  },
  evm: {
    rpcUrl: 'https://base-mainnet.alchemyapi.io/v2/your_key',
    walletAddress: '0xYourWalletAddress',
    privateKey: 'YourPrivateKey',
    chainId: '8453' // Base 链
  }
});
```

### 3. 动态配置（支持外部程序传入）

```typescript
import { OKXDEXClient } from './src';

const client = new OKXDEXClient();

// 外部程序可以动态设置私钥和地址
client.setPrivateKey('user_private_key_from_external_source');
client.setWalletAddress('0xUserWalletAddress');

// 执行交易
const result = await client.swap(params);
```

## 🔗 API 接口

### 核心方法

#### `getQuote(params)` - 获取交易报价

```typescript
const quote = await client.getQuote({
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,          // 最小单位数量
  slippage?: string        // 滑点，默认 0.5%
});
```

#### `swap(params)` - 执行代币交换

```typescript
const result = await client.swap({
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  slippage?: string
});
```

#### `approve(params)` - 代币授权

```typescript
const result = await client.approve({
  tokenAddress: string,
  amount: string
});
```

#### `trackTransaction(orderId)` - 追踪交易状态

```typescript
const status = await client.trackTransaction('order_id');
```

### 辅助方法

```typescript
// 获取账户信息
const ethBalance = await client.getETHBalance();
const tokenBalance = await client.getTokenBalance('0x...');

// 获取支持的链和代币
const chains = await client.getSupportedChains();
const tokens = await client.getSupportedTokens();

// 检查连接状态
const isConnected = await client.checkConnection();
```

## 🌐 Web 界面

启动 Web 服务器：

```bash
npm run web
```

访问 `http://localhost:3000` 使用 Web 界面进行交易。

### Web API 端点

- `POST /api/config` - 设置钱包配置
- `GET /api/account` - 获取账户信息
- `GET /api/tokens` - 获取支持的代币
- `POST /api/quote` - 获取交易报价
- `POST /api/swap` - 执行交换
- `GET /api/track/:orderId` - 追踪交易
- `GET /api/balance/:tokenAddress` - 获取代币余额

## 🧪 测试

运行基础测试：

```bash
npm test
```

测试包括：
- 客户端创建测试
- 网络连接测试
- API 功能测试
- 配置验证测试

## 📝 外部程序集成示例

### Node.js 程序集成

```typescript
import { OKXDEXClient } from 'okx-dex-api';

class MyTradingBot {
  private dexClient: OKXDEXClient;

  constructor() {
    this.dexClient = new OKXDEXClient({
      okx: {
        apiKey: process.env.OKX_API_KEY!,
        secretKey: process.env.OKX_SECRET_KEY!,
        apiPassphrase: process.env.OKX_API_PASSPHRASE!,
        projectId: process.env.OKX_PROJECT_ID!
      },
      evm: {
        rpcUrl: process.env.EVM_RPC_URL!,
        walletAddress: process.env.WALLET_ADDRESS!,
        privateKey: process.env.PRIVATE_KEY!
      }
    });
  }

  async executeArbitrageStrategy() {
    // 获取报价
    const quote = await this.dexClient.getQuote({
      fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: '1000000000000000000' // 1 ETH
    });

    // 检查套利机会
    if (this.checkArbitrageOpportunity(quote)) {
      const result = await this.dexClient.swap({
        fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '1000000000000000000'
      });

      return result;
    }
  }

  private checkArbitrageOpportunity(quote: any): boolean {
    // 套利逻辑
    return true;
  }
}
```

### Python 程序调用 (通过 Web API)

```python
import requests
import json

class OKXDEXPythonClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
    
    def set_config(self, wallet_address, private_key):
        response = requests.post(f'{self.base_url}/api/config', json={
            'walletAddress': wallet_address,
            'privateKey': private_key
        })
        return response.json()
    
    def get_quote(self, from_token, to_token, amount, slippage='0.5'):
        response = requests.post(f'{self.base_url}/api/quote', json={
            'fromTokenAddress': from_token,
            'toTokenAddress': to_token,
            'amount': amount,
            'slippage': slippage
        })
        return response.json()
    
    def execute_swap(self, from_token, to_token, amount, slippage='0.5'):
        response = requests.post(f'{self.base_url}/api/swap', json={
            'fromTokenAddress': from_token,
            'toTokenAddress': to_token,
            'amount': amount,
            'slippage': slippage
        })
        return response.json()

# 使用示例
client = OKXDEXPythonClient()
client.set_config('0x...', 'private_key')
quote = client.get_quote('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 
                        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 
                        '1000000000000000')
```

## 🔐 安全注意事项

1. **私钥安全**: 
   - 永远不要在代码中硬编码私钥
   - 使用环境变量或安全的密钥管理系统
   - 对于生产环境，考虑使用硬件钱包或多重签名

2. **API 密钥保护**:
   - 定期轮换 API 密钥
   - 设置适当的 IP 白名单
   - 监控 API 使用情况

3. **交易安全**:
   - 始终验证交易参数
   - 设置合理的滑点限制
   - 在主网交易前先在测试网验证

## 🌐 支持的网络

| 网络 | Chain ID | 代币示例 |
|------|----------|----------|
| 以太坊主网 | 1 | ETH, USDC, USDT |
| Base | 8453 | ETH, USDC |
| BSC | 56 | BNB, USDT |
| Polygon | 137 | MATIC, USDC |
| Arbitrum | 42161 | ETH, USDC |
| Optimism | 10 | ETH, USDC |

## 🔧 常见问题

### Q: 如何处理交易失败？

A: 程序内置了完整的错误处理机制：

```typescript
const result = await client.swap(params);
if (!result.success) {
  console.error('交易失败:', result.error);
  // 处理失败逻辑
}
```

### Q: 如何设置不同的网络？

A: 修改 `CHAIN_ID` 环境变量或在配置中指定：

```typescript
const client = createOKXDEXClient({
  evm: {
    chainId: '8453', // Base 网络
    rpcUrl: 'https://base-mainnet.alchemyapi.io/v2/your_key',
    // ... 其他配置
  }
});
```

### Q: 如何获取代币的最小单位数量？

A: 使用以下公式：`实际数量 × 10^代币精度`

```typescript
// 例如：0.001 ETH = 0.001 × 10^18 = 1000000000000000
const amount = '1000000000000000';
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 📄 许可证

MIT License

## 📞 支持

如果您遇到任何问题，请：

1. 查看本文档的常见问题部分
2. 在 GitHub 上提交 Issue
3. 参考 OKX DEX 官方文档

---

**免责声明**: 本程序仅供学习和研究使用。在生产环境中使用前，请充分测试并了解相关风险。作者不对使用本程序造成的任何损失承担责任。 