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

// API URL
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

    const response = await axios.get(url, { params, headers });

    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`API 错误: ${response.data.msg || '未知错误'}`);
    }
  } catch (error) {
    console.error('获取交换报价失败:', (error as Error).message);
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
 * 格式化代币数量显示
 */
function formatTokenAmount(amount: string, tokenAddress: string): string {
  const amountBigInt = BigInt(amount);
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
 * 显示报价详情
 */
function displayQuoteDetails(quote: any, fromToken: string, toToken: string, inputAmount: string): void {
  console.log('\n📊 报价详情:');
  console.log('─'.repeat(50));
  
  // 基本信息
  console.log(`🔄 交换对: ${getTokenSymbol(fromToken)} -> ${getTokenSymbol(toToken)}`);
  console.log(`📥 输入数量: ${formatTokenAmount(inputAmount, fromToken)} ${getTokenSymbol(fromToken)}`);
  console.log(`📤 预期输出: ${formatTokenAmount(quote.toTokenAmount, toToken)} ${getTokenSymbol(toToken)}`);
  
  // 价格信息
  if (quote.fromTokenAmount && quote.toTokenAmount) {
    const fromAmount = BigInt(quote.fromTokenAmount);
    const toAmount = BigInt(quote.toTokenAmount);
    
    // 计算汇率（简化计算，实际应考虑小数位差异）
    if (fromAmount > 0n) {
      const rate = Number(toAmount) / Number(fromAmount);
      console.log(`💱 汇率: 1 ${getTokenSymbol(fromToken)} ≈ ${rate.toFixed(6)} ${getTokenSymbol(toToken)}`);
    }
  }
  
  // DEX 信息
  if (quote.dexes && quote.dexes.length > 0) {
    console.log(`🏪 使用的 DEX: ${quote.dexes.map((dex: any) => dex.dexName).join(', ')}`);
  }
  
  // Gas 费用
  if (quote.estimateGasFee) {
    console.log(`⛽ 预估 Gas 费: ${formatTokenAmount(quote.estimateGasFee, TOKEN_ADDRESSES.ETH)} ETH`);
  }
  
  console.log('─'.repeat(50));
}

/**
 * 测试单个代币对的报价
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
    
    // 验证报价数据
    if (!quote.toTokenAmount || BigInt(quote.toTokenAmount) <= 0n) {
      throw new Error('输出代币数量无效');
    }
    
    console.log('✅ 测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', (error as Error).message);
    return false;
  }
}

/**
 * 测试不同滑点设置
 */
async function testSlippageVariations(): Promise<void> {
  console.log('\n🎯 测试不同滑点设置');
  console.log('='.repeat(60));
  
  const slippages = ['0.1', '0.5', '1.0', '3.0'];
  
  for (const slippage of slippages) {
    try {
      console.log(`\n📊 滑点: ${slippage}%`);
      
      const quote = await getSwapQuote(
        TOKEN_ADDRESSES.ETH,
        TOKEN_ADDRESSES.USDC,
        TEST_AMOUNTS.MEDIUM,
        WALLET_ADDRESS,
        slippage
      );
      
      console.log(`💰 输出数量: ${formatTokenAmount(quote.toTokenAmount, TOKEN_ADDRESSES.USDC)} USDC`);
      
      if (quote.estimateGasFee) {
        console.log(`⛽ Gas 费: ${formatTokenAmount(quote.estimateGasFee, TOKEN_ADDRESSES.ETH)} ETH`);
      }
      
    } catch (error) {
      console.error(`❌ 滑点 ${slippage}% 测试失败:`, (error as Error).message);
    }
  }
}

/**
 * 测试不同数量级的报价
 */
async function testAmountVariations(): Promise<void> {
  console.log('\n📊 测试不同数量级的报价');
  console.log('='.repeat(60));
  
  const amounts = [
    { amount: TEST_AMOUNTS.SMALL, name: '小额 (0.0001 ETH)' },
    { amount: TEST_AMOUNTS.MEDIUM, name: '中等 (0.001 ETH)' },
    { amount: TEST_AMOUNTS.LARGE, name: '大额 (0.01 ETH)' },
    { amount: TEST_AMOUNTS.VERY_LARGE, name: '超大额 (0.1 ETH)' }
  ];
  
  for (const testCase of amounts) {
    try {
      console.log(`\n💰 ${testCase.name}`);
      
      const quote = await getSwapQuote(
        TOKEN_ADDRESSES.ETH,
        TOKEN_ADDRESSES.USDC,
        testCase.amount,
        WALLET_ADDRESS
      );
      
      console.log(`📤 输出: ${formatTokenAmount(quote.toTokenAmount, TOKEN_ADDRESSES.USDC)} USDC`);
      
      // 计算单位价格
      const ethAmount = BigInt(testCase.amount);
      const usdcAmount = BigInt(quote.toTokenAmount);
      const pricePerEth = Number(usdcAmount) / Number(ethAmount) * 1e12; // 考虑小数位差异
      
      console.log(`💱 单价: 1 ETH ≈ ${pricePerEth.toFixed(2)} USDC`);
      
    } catch (error) {
      console.error(`❌ ${testCase.name} 测试失败:`, (error as Error).message);
    }
  }
}

/**
 * 主测试函数
 */
async function runQuoteTests(): Promise<void> {
  console.log('🚀 开始 OKX DEX 报价测试');
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
  
  // 测试主要代币对
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
    },
    {
      from: TOKEN_ADDRESSES.ETH,
      to: TOKEN_ADDRESSES.DAI,
      amount: TEST_AMOUNTS.MEDIUM,
      description: 'ETH -> DAI 交换报价'
    },
    {
      from: TOKEN_ADDRESSES.USDC,
      to: TOKEN_ADDRESSES.USDT,
      amount: '1000000', // 1 USDC
      description: 'USDC -> USDT 稳定币交换'
    }
  ];
  
  // 执行代币对测试
  for (const test of tokenPairTests) {
    totalTests++;
    const passed = await testTokenPairQuote(test.from, test.to, test.amount, test.description);
    if (passed) passedTests++;
    
    // 添加延迟避免 API 限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 测试不同滑点设置
  await testSlippageVariations();
  
  // 等待一下再继续
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试不同数量级
  await testAmountVariations();
  
  // 测试结果总结
  console.log('\n📋 测试结果总结');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${passedTests}/${totalTests} 个基础测试`);
  console.log(`📊 完成滑点变化测试`);
  console.log(`💰 完成数量级变化测试`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有基础测试都通过了！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
  }
}

// 处理未捕获的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});

// 运行测试
if (require.main === module) {
  runQuoteTests()
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
  runQuoteTests
}; 