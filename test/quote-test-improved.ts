import { Web3 } from 'web3';
import axios from 'axios';
import * as dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

// 加载环境变量
dotenv.config();

// 连接到 Base 网络
const web3 = new Web3('https://mainnet.base.org');

// 钱包地址 - 从环境变量读取
const WALLET_ADDRESS: string = process.env.EVM_WALLET_ADDRESS || '0xYourWalletAddress';

// Base 链上的代币地址
const TOKEN_ADDRESSES = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',  // 原生 ETH
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  WETH: '0x4200000000000000000000000000000000000006', // Wrapped ETH
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',  // DAI on Base
  USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'  // USDT on Base
};

// 链 ID
const chainId: string = '8453';

// API URL - 使用生产端点
const baseUrl: string = 'https://www.okx.com/api/v5/';

// 测试用的交换金额（不同数量级）
const TEST_AMOUNTS = {
  SMALL: '100000000000000',      // 0.0001 ETH
  MEDIUM: '1000000000000000',    // 0.001 ETH  
  LARGE: '10000000000000000',    // 0.01 ETH
  VERY_LARGE: '100000000000000000' // 0.1 ETH
};

/**
 * 获取请求头
 */
function getHeaders(timestamp: string, method: string, requestPath: string, queryString = ""): any {
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE;
    const projectId = process.env.OKX_PROJECT_ID;

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
        throw new Error("缺少必要的环境变量，请检查 .env 文件");
    }

    const stringToSign = timestamp + method + requestPath + queryString;
    return {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": apiKey,
        "OK-ACCESS-SIGN": CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(stringToSign, secretKey)
        ),
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": apiPassphrase,
        "OK-ACCESS-PROJECT": projectId,
    };
}

/**
 * 获取交换报价
 * @param fromTokenAddress - 源代币地址
 * @param toTokenAddress - 目标代币地址
 * @param amount - 交换数量
 * @param userAddress - 用户钱包地址
 * @param slippage - 滑点容忍度
 * @returns 交换报价数据
 */
async function getSwapQuote(
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  userAddress: string,
  slippage: string = '0.5'
): Promise<any> {
  try {
    const path = 'dex/aggregator/swap';
    const url = `${baseUrl}${path}`;

    const params = {
      chainId: chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress: userAddress,
      slippage
    };

    // 准备认证
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

    console.log(`🔍 获取报价: ${getTokenSymbol(fromTokenAddress)} -> ${getTokenSymbol(toTokenAddress)}`);
    console.log(`💰 数量: ${formatTokenAmount(amount, fromTokenAddress)}`);

    const response = await axios.get(url, { 
      params, 
      headers,
      timeout: 15000 // 增加超时时间
    });

    if (response.data.code === '0') {
      // 打印原始响应数据用于调试
      console.log('📄 原始API响应:', JSON.stringify(response.data, null, 2));
      return response.data.data[0];
    } else {
      throw new Error(`API 错误: ${response.data.msg || '未知错误'}`);
    }
  } catch (error: any) {
    console.error('获取交换报价失败:', error.message);
    
    // 详细错误信息
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * 获取代币符号
 */
function getTokenSymbol(address: string): string {
  const symbolMap: { [key: string]: string } = {
    [TOKEN_ADDRESSES.ETH]: 'ETH',
    [TOKEN_ADDRESSES.USDC]: 'USDC',
    [TOKEN_ADDRESSES.WETH]: 'WETH',
    [TOKEN_ADDRESSES.DAI]: 'DAI',
    [TOKEN_ADDRESSES.USDT]: 'USDT'
  };
  return symbolMap[address] || '未知代币';
}

/**
 * 格式化代币数量显示 - 改进版本，处理各种数据类型
 */
function formatTokenAmount(amount: string | number | bigint, tokenAddress: string): string {
  let amountBigInt: bigint;
  
  // 安全地转换为 BigInt
  try {
    if (typeof amount === 'bigint') {
      amountBigInt = amount;
    } else if (typeof amount === 'string') {
      // 移除小数点，因为 BigInt 不支持小数
      const cleanAmount = amount.split('.')[0];
      amountBigInt = BigInt(cleanAmount);
    } else {
      amountBigInt = BigInt(Math.floor(Number(amount)));
    }
  } catch (error) {
    console.error('格式化代币数量失败:', error);
    return amount.toString();
  }
  
  let decimals = 18; // 默认 18 位小数

  // USDC 和 USDT 通常是 6 位小数
  if (tokenAddress === TOKEN_ADDRESSES.USDC || tokenAddress === TOKEN_ADDRESSES.USDT) {
    decimals = 6;
  }

  const divisor = BigInt(10 ** decimals);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  if (trimmedFractional) {
    return `${wholePart}.${trimmedFractional}`;
  } else {
    return wholePart.toString();
  }
}

/**
 * 安全地显示报价详情 - 处理可能缺失的字段
 */
function displayQuoteDetails(quote: any, fromToken: string, toToken: string, inputAmount: string): void {
  console.log('\n📊 报价详情:');
  console.log('─'.repeat(50));
  
  // 基本信息
  console.log(`🔄 交换对: ${getTokenSymbol(fromToken)} -> ${getTokenSymbol(toToken)}`);
  console.log(`📥 输入数量: ${formatTokenAmount(inputAmount, fromToken)} ${getTokenSymbol(fromToken)}`);
  
  // 从正确的路径获取输出数量
  const routerResult = quote.routerResult;
  if (routerResult && routerResult.toTokenAmount) {
    console.log(`📤 预期输出: ${formatTokenAmount(routerResult.toTokenAmount, toToken)} ${getTokenSymbol(toToken)}`);
  } else {
    console.log(`📤 预期输出: 数据不可用`);
  }
  
  // 价格信息 - 使用 routerResult 中的数据
  if (routerResult && routerResult.fromTokenAmount && routerResult.toTokenAmount) {
    try {
      const fromAmount = BigInt(routerResult.fromTokenAmount);
      const toAmount = BigInt(routerResult.toTokenAmount);
      
      if (fromAmount > 0n) {
        // 获取代币小数位
        let fromDecimals = 18;
        let toDecimals = 18;
        
        if (fromToken === TOKEN_ADDRESSES.USDC || fromToken === TOKEN_ADDRESSES.USDT) {
          fromDecimals = 6;
        }
        if (toToken === TOKEN_ADDRESSES.USDC || toToken === TOKEN_ADDRESSES.USDT) {
          toDecimals = 6;
        }
        
        // 计算考虑小数位的汇率
        const fromAmountDecimal = Number(fromAmount) / Math.pow(10, fromDecimals);
        const toAmountDecimal = Number(toAmount) / Math.pow(10, toDecimals);
        const rate = toAmountDecimal / fromAmountDecimal;
        
        console.log(`💱 汇率: 1 ${getTokenSymbol(fromToken)} ≈ ${rate.toFixed(6)} ${getTokenSymbol(toToken)}`);
      }
    } catch (error) {
      console.log(`💱 汇率: 计算失败`);
    }
  }
  
  // DEX 信息 - 从 quoteCompareList 获取
  if (routerResult && routerResult.quoteCompareList && Array.isArray(routerResult.quoteCompareList) && routerResult.quoteCompareList.length > 0) {
    const dexNames = routerResult.quoteCompareList.slice(0, 3).map((dex: any) => dex.dexName || '未知DEX').join(', ');
    console.log(`🏪 可用的 DEX: ${dexNames}${routerResult.quoteCompareList.length > 3 ? ' 等' : ''}`);
  }
  
  // 最佳路由信息
  if (routerResult && routerResult.dexRouterList && routerResult.dexRouterList.length > 0) {
    const bestRoute = routerResult.dexRouterList[0];
    if (bestRoute.subRouterList && bestRoute.subRouterList.length > 0) {
      const protocols = bestRoute.subRouterList[0].dexProtocol;
      if (protocols && protocols.length > 0) {
        const protocolNames = protocols.map((p: any) => `${p.dexName} (${p.percent}%)`).join(', ');
        console.log(`🎯 最佳路由: ${protocolNames}`);
      }
    }
  }
  
  // Gas 费用
  if (routerResult && routerResult.estimateGasFee) {
    console.log(`⛽ 预估 Gas 费: ${formatTokenAmount(routerResult.estimateGasFee, TOKEN_ADDRESSES.ETH)} ETH`);
  }
  
  // 价格影响
  if (routerResult && routerResult.priceImpactPercentage) {
    console.log(`📈 价格影响: ${routerResult.priceImpactPercentage}%`);
  }
  
  // 交易费用
  if (routerResult && routerResult.tradeFee) {
    console.log(`💸 交易费用: ${routerResult.tradeFee} ${getTokenSymbol(fromToken)}`);
  }
  
  console.log('─'.repeat(50));
}

/**
 * 测试单个代币对的报价 - 增强版本
 */
async function testTokenPairQuote(
  fromToken: string, 
  toToken: string, 
  amount: string, 
  description: string
): Promise<boolean> {
  try {
    console.log(`\n🧪 ${description}`);
    
    const quote = await getSwapQuote(fromToken, toToken, amount, WALLET_ADDRESS);
    displayQuoteDetails(quote, fromToken, toToken, amount);
    
    // 更新验证逻辑以匹配新的数据结构
    if (!quote || typeof quote !== 'object') {
      throw new Error('无效的报价数据');
    }
    
    const routerResult = quote.routerResult;
    if (!routerResult || !routerResult.toTokenAmount) {
      throw new Error('缺少输出代币数量');
    }
    
    // 尝试验证输出数量是否为正数
    try {
      const outputAmount = BigInt(routerResult.toTokenAmount);
      if (outputAmount <= 0n) {
        throw new Error('输出代币数量无效');
      }
    } catch (bigintError) {
      // 如果 BigInt 转换失败，尝试数字验证
      const outputAmount = Number(routerResult.toTokenAmount);
      if (isNaN(outputAmount) || outputAmount <= 0) {
        throw new Error('输出代币数量无效');
      }
    }
    
    console.log('✅ 测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', (error as Error).message);
    return false;
  }
}

/**
 * 主测试函数 - 优化限速处理
 */
async function runImprovedQuoteTests(): Promise<void> {
  console.log('🚀 开始 OKX DEX 报价测试 (改进版)');
  console.log('='.repeat(60));
  
  // 检查环境变量
  if (!process.env.OKX_API_KEY) {
    console.error('❌ 错误: 缺少 OKX API 配置，请检查 .env 文件');
    return;
  }
  
  if (!WALLET_ADDRESS || WALLET_ADDRESS === '0xYourWalletAddress') {
    console.error('❌ 错误: 请在 .env 文件中设置有效的钱包地址');
    return;
  }
  
  let passedTests = 0;
  let totalTests = 0;
  
  // 测试主要代币对 - 减少测试数量避免限速
  const tokenPairTests = [
    {
      from: TOKEN_ADDRESSES.ETH,
      to: TOKEN_ADDRESSES.USDC,
      amount: TEST_AMOUNTS.MEDIUM,
      description: 'ETH -> USDC 交换报价'
    },
    {
      from: TOKEN_ADDRESSES.USDC,
      to: TOKEN_ADDRESSES.ETH,
      amount: '1000000', // 1 USDC (6 decimals)
      description: 'USDC -> ETH 交换报价'
    }
  ];
  
  // 执行代币对测试 - 增加延迟
  for (const test of tokenPairTests) {
    totalTests++;
    console.log(`\n⏱️  等待 3 秒避免限速...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const passed = await testTokenPairQuote(test.from, test.to, test.amount, test.description);
    if (passed) passedTests++;
  }
  
  // 测试结果总结
  console.log('\n📋 测试结果总结');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${passedTests}/${totalTests} 个测试`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试都通过了！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
  }
  
  console.log('\n💡 提示: 如果遇到限速错误(429)，请等待更长时间再重试');
}

// 处理未捕获的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});

// 运行测试
if (require.main === module) {
  runImprovedQuoteTests()
    .then(() => {
      console.log('\n🏁 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 测试执行失败:', error.message);
      process.exit(1);
    });
}

export {
  getSwapQuote,
  testTokenPairQuote,
  runImprovedQuoteTests
}; 