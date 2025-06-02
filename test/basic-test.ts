import { OKXDEXClient, createOKXDEXClient } from '../src/index';

/**
 * 基础功能测试脚本
 */
async function runBasicTests() {
  console.log('🚀 开始 OKX DEX API 基础测试...\n');

  try {
    // 测试1: 创建客户端实例
    console.log('📋 测试1: 创建客户端实例');
    let client: OKXDEXClient;
    
    try {
      client = createOKXDEXClient();
      console.log('✅ 客户端创建成功');
    } catch (error) {
      console.log('⚠️  使用环境变量创建客户端失败，尝试手动配置');
      
      // 如果环境变量不完整，可以手动配置
      const customConfig = {
        okx: {
          apiKey: 'your_api_key',
          secretKey: 'your_secret_key',
          apiPassphrase: 'your_passphrase',
          projectId: 'your_project_id'
        },
        evm: {
          rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/your_key',
          walletAddress: '0xYourWalletAddress',
          privateKey: 'YourPrivateKey',
          chainId: '1'
        }
      };
      
      console.log('ℹ️  请在 .env 文件中配置正确的参数，或通过代码传入配置');
      console.log('配置示例:', JSON.stringify(customConfig, null, 2));
      return;
    }

    // 测试2: 检查网络连接
    console.log('\n📋 测试2: 检查网络连接');
    try {
      const isConnected = await client.checkConnection();
      console.log(`${isConnected ? '✅' : '❌'} 网络连接状态: ${isConnected ? '已连接' : '未连接'}`);
    } catch (error) {
      console.log(`❌ 网络连接检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 测试3: 获取支持的链列表
    console.log('\n📋 测试3: 获取支持的链列表');
    try {
      const chains = await client.getSupportedChains();
      console.log(`✅ 支持的链数量: ${chains.length}`);
      console.log('前3个链:', chains.slice(0, 3).map(chain => ({
        chainId: chain.chainId,
        chainName: chain.chainName
      })));
    } catch (error) {
      console.log(`❌ 获取链列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 测试4: 获取支持的代币列表
    console.log('\n📋 测试4: 获取支持的代币列表');
    try {
      const tokens = await client.getSupportedTokens();
      console.log(`✅ 支持的代币数量: ${tokens.length}`);
      console.log('前3个代币:', tokens.slice(0, 3).map(token => ({
        symbol: token.tokenSymbol,
        address: token.tokenContractAddress
      })));
    } catch (error) {
      console.log(`❌ 获取代币列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 测试5: 获取账户余额
    console.log('\n📋 测试5: 获取账户余额');
    try {
      const ethBalance = await client.getETHBalance();
      console.log(`✅ ETH 余额: ${ethBalance} ETH`);
    } catch (error) {
      console.log(`❌ 获取余额失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 测试6: 获取交易报价（模拟）
    console.log('\n📋 测试6: 获取交易报价');
    try {
      const quoteParams = {
        fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',   // USDC
        amount: '1000000000000000', // 0.001 ETH
        slippage: '0.5'
      };

      const quote = await client.getQuote(quoteParams);
      console.log('✅ 获取报价成功');
      console.log(`从 ${quote.fromToken.tokenSymbol} 到 ${quote.toToken.tokenSymbol}`);
      console.log(`输入数量: ${quote.fromTokenAmount}`);
      console.log(`预期输出: ${quote.toTokenAmount}`);
      console.log(`价格影响: ${quote.priceImpactPercentage}%`);
      console.log(`预估Gas费用: ${quote.estimateGasFee}`);
    } catch (error) {
      console.log(`❌ 获取报价失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('\n🎉 基础测试完成！');
    console.log('\n💡 注意事项:');
    console.log('1. 确保已正确配置 .env 文件中的API密钥');
    console.log('2. 确保钱包地址和私钥正确');
    console.log('3. 确保网络连接正常');
    console.log('4. 实际交易前请仔细检查参数');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

/**
 * 配置验证测试
 */
async function testConfigValidation() {
  console.log('\n📋 额外测试: 配置验证');

  // 测试动态设置配置
  try {
    const client = new OKXDEXClient();
    
    // 测试设置新的私钥和地址
    console.log('测试动态配置设置...');
    client.setWalletAddress('0x742d35Cc2C6C8a2d7B5c0d1b52F7b4D2F64b2a3E');
    client.setPrivateKey('test_private_key_placeholder');
    
    console.log('✅ 动态配置设置功能正常');
  } catch (error) {
    console.log(`⚠️  动态配置测试跳过: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 主测试函数
 */
async function main() {
  await runBasicTests();
  await testConfigValidation();
  
  console.log('\n📚 使用说明:');
  console.log('1. 基础用法:');
  console.log('   ```typescript');
  console.log('   import { createOKXDEXClient } from "okx-dex-api";');
  console.log('   const client = createOKXDEXClient();');
  console.log('   const quote = await client.getQuote(params);');
  console.log('   ```');
  
  console.log('\n2. 自定义配置:');
  console.log('   ```typescript');
  console.log('   const client = createOKXDEXClient({');
  console.log('     okx: { apiKey: "...", ... },');
  console.log('     evm: { rpcUrl: "...", ... }');
  console.log('   });');
  console.log('   ```');
  
  console.log('\n3. 动态设置:');
  console.log('   ```typescript');
  console.log('   client.setPrivateKey("your_private_key");');
  console.log('   client.setWalletAddress("0x...");');
  console.log('   ```');
}

// 执行测试
if (require.main === module) {
  main().catch(console.error);
}

export { runBasicTests, testConfigValidation }; 