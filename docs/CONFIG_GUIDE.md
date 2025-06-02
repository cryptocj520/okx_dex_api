# OKX DEX API 配置指南

本指南将帮助您完成 OKX DEX API 的完整配置。

## 📋 配置清单

### 1. OKX API 配置 🔑

您需要从 OKX Web3 开发者平台获取以下信息：

- **API Key**: 用于身份验证的公钥
- **Secret Key**: 用于签名的私钥  
- **API Passphrase**: 额外的安全口令
- **Project ID**: 项目标识符

#### 获取步骤：

1. 访问 [OKX Web3 开发者管理平台](https://web3.okx.com/zh-hans/build/dev-docs/dex-api/dex-developer-portal)
2. 点击 **连接钱包** 创建或登录账户
3. 在项目中点击 **"API key"** 按钮
4. 点击 **"创建 API key"** 按钮
5. 填写以下信息：
   - **API Key 名称**: 自定义名称
   - **密码(Passphrase)**: ⚠️ **这就是 `API Passphrase`，请自己设置并牢记**
6. 创建后获得：
   - **API Key**: 公开标识符
   - **Secret Key**: 私钥（仅显示一次，请立即保存）
   - **API Passphrase**: 您刚才设置的密码短语
   - **Project ID**: 在项目详细信息页面显示

⚠️ **重要提醒**：
- **API Passphrase** 是您在创建 API Key 时自己设置的密码，不是系统生成的
- **Secret Key** 只能查看一次，创建后请立即复制保存
- **Project ID** 可在项目详细信息页面找到

### 2. 网络配置 🌐

#### RPC URL 获取：

**推荐提供商**：
- [Alchemy](https://alchemy.com) - 免费额度每天 300M 请求
- [Infura](https://infura.io) - 免费额度每天 100K 请求
- [QuickNode](https://quicknode.com) - 高性能节点

**不同网络的 RPC URL 格式**：
```
以太坊主网: https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY
Base:      https://base-mainnet.alchemyapi.io/v2/YOUR_KEY
BSC:       https://bsc-dataseed.binance.org/
Polygon:   https://polygon-mainnet.alchemyapi.io/v2/YOUR_KEY
Arbitrum:  https://arb-mainnet.alchemyapi.io/v2/YOUR_KEY
Optimism:  https://opt-mainnet.alchemyapi.io/v2/YOUR_KEY
```

#### 链 ID 选择：
- **1**: 以太坊主网 (推荐新手)
- **8453**: Base (低手续费)
- **56**: BSC (低手续费) 
- **137**: Polygon (低手续费)
- **42161**: Arbitrum (L2 扩容)
- **10**: Optimism (L2 扩容)

### 3. 钱包配置 👛

#### 钱包要求：
- **钱包地址**: 以 `0x` 开头的 42 位十六进制地址
- **私钥**: 64 位十六进制字符串(不含 0x 前缀)
- **余额要求**: 钱包中需要有足够的原生代币作为 Gas 费

#### 安全提醒：
- 🔒 私钥绝不要分享给任何人
- 💰 建议使用测试钱包，不要使用主钱包
- 📱 考虑使用硬件钱包生成的地址

## 🚀 快速配置示例

### 以太坊主网配置
```json
{
  "okx": {
    "apiKey": "your_okx_api_key",
    "secretKey": "your_okx_secret_key", 
    "apiPassphrase": "your_okx_passphrase",
    "projectId": "your_okx_project_id"
  },
  "evm": {
    "rpcUrl": "https://eth-mainnet.alchemyapi.io/v2/your_alchemy_key",
    "chainId": "1",
    "walletAddress": "0x742d35Cc2C6C8a2d7B5c0d1b52F7b4D2F64b2a3E",
    "privateKey": "your_private_key_without_0x_prefix"
  }
}
```

### Base 网络配置 (推荐低成本交易)
```json
{
  "okx": {
    "apiKey": "your_okx_api_key",
    "secretKey": "your_okx_secret_key",
    "apiPassphrase": "your_okx_passphrase", 
    "projectId": "your_okx_project_id"
  },
  "evm": {
    "rpcUrl": "https://base-mainnet.alchemyapi.io/v2/your_alchemy_key",
    "chainId": "8453",
    "walletAddress": "0x742d35Cc2C6C8a2d7B5c0d1b52F7b4D2F64b2a3E",
    "privateKey": "your_private_key_without_0x_prefix"
  }
}
```

## 🔧 配置方式

### 方式一：环境变量配置
```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件
nano .env
```

### 方式二：Web 界面配置
1. 启动服务：`npm run web`
2. 访问：http://localhost:3000
3. 在 "API 与钱包配置" 部分填入信息
4. 点击 "设置完整配置"

### 方式三：代码配置
```typescript
import { createOKXDEXClient } from './src';

const client = createOKXDEXClient({
  okx: { /* OKX 配置 */ },
  evm: { /* EVM 配置 */ }
});
```

## ⚠️ 常见问题

### Q: "配置无效" 错误
**原因**: 配置参数不完整或格式错误
**解决**: 检查所有必填项是否填写，钱包地址是否以 `0x` 开头

### Q: "网络连接失败" 
**原因**: RPC URL 无效或网络问题
**解决**: 
- 检查 RPC URL 是否正确
- 尝试更换 RPC 提供商
- 检查网络连接

### Q: "OKX API 错误"
**原因**: API 密钥无效或权限不足
**解决**:
- 验证 API 密钥是否正确
- 检查 API 密钥权限设置
- 确认项目 ID 正确

### Q: "交易失败"
**原因**: Gas 不足或代币余额不足
**解决**:
- 确保钱包有足够的 ETH/原生代币作为 Gas
- 检查要交换的代币余额
- 调整滑点设置

## 💡 最佳实践

1. **安全第一**: 使用测试钱包，小额测试
2. **备份配置**: 保存配置信息到安全位置  
3. **监控使用**: 定期检查 API 使用量
4. **错误处理**: 仔细阅读错误信息
5. **版本更新**: 定期更新到最新版本

## 📞 获取帮助

如果配置过程中遇到问题：
1. 查看控制台错误信息
2. 检查本文档的常见问题部分
3. 参考项目 README.md
4. 在 GitHub 提交 Issue 