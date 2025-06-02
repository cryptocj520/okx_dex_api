import axios from 'axios';
import * as dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

// 加载环境变量
dotenv.config();

// 钱包信息 - 从环境变量读取
const WALLET_ADDRESS: string = process.env.EVM_WALLET_ADDRESS || '0xYourWalletAddress';

// BSC 链上的代币地址
const BSC_TOKEN_ADDRESSES = {
  BNB: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',  // 原生 BNB
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // Wrapped BNB
  USDT: '0x55d398326f99059fF775485246999027B3197955', // BSC USDT
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC USDC
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'  // BSC BUSD
};

// BSC 链 ID
const chainId: string = '56';

// API URL - 使用DEX聚合器端点
const baseUrl: string = 'https://www.okx.com/api/v5/';

// 测试配置
const QUOTE_TESTS = [
  {
    fromToken: BSC_TOKEN_ADDRESSES.USDT,
    toToken: BSC_TOKEN_ADDRESSES.WBNB,
    fromSymbol: 'USDT',
    toSymbol: 'WBNB',
    amount: '1',  // 1 USDT
    slippage: '0.5'
  },
  {
    fromToken: BSC_TOKEN_ADDRESSES.WBNB,
    toToken: BSC_TOKEN_ADDRESSES.USDT,
    fromSymbol: 'WBNB',
    toSymbol: 'USDT',
    amount: '0.01',  // 0.01 WBNB
    slippage: '0.5'
  },
  {
    fromToken: BSC_TOKEN_ADDRESSES.USDC,
    toToken: BSC_TOKEN_ADDRESSES.WBNB,
    fromSymbol: 'USDC',
    toSymbol: 'WBNB',
    amount: '10',  // 10 USDC
    slippage: '0.5'
  }
];

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
 * 将人类可读数量转换为原子单位
 */
function toAtomicUnits(amount: string, tokenAddress: string): string {
  // BSC 上的大多数代币都是 18 位小数
  const decimals = 18;
  const atomicAmount = BigInt(parseFloat(amount) * Math.pow(10, decimals));
  return atomicAmount.toString();
}

/**
 * 将原子单位转换为人类可读数量
 */
function fromAtomicUnits(atomicAmount: string, tokenAddress: string): string {
  const decimals = 18;
  const amount = BigInt(atomicAmount);
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  if (trimmedFractional) {
    return `${wholePart}.${trimmedFractional}`;
  } else {
    return wholePart.toString();
  }
}

/**
 * 获取交换报价
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

    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

    const response = await axios.get(url, { 
      params, 
      headers,
      timeout: 15000 
    });

    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`API 错误: ${response.data.msg || '未知错误'}`);
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('认证失败：请检查 API 密钥和端点');
    } else if (error.response?.status === 429) {
      throw new Error('请求限速：请等待后重试');
    }
    throw error;
  }
}

/**
 * 显示报价详情
 */
function displayQuoteDetails(quote: any, testConfig: any): void {
  console.log('\n📊 报价详情:');
  console.log('='.repeat(60));
  
  const routerResult = quote.routerResult;
  if (!routerResult) {
    console.log('❌ 无法获取报价详情');
    return;
  }

  // 基本信息
  console.log(`🔄 交换对: ${testConfig.fromSymbol} -> ${testConfig.toSymbol}`);
  console.log(`📥 输入数量: ${testConfig.amount} ${testConfig.fromSymbol}`);
  
  if (routerResult.toTokenAmount) {
    const outputAmount = fromAtomicUnits(routerResult.toTokenAmount, testConfig.toToken);
    console.log(`📤 预期输出: ${outputAmount} ${testConfig.toSymbol}`);
  }

  // 汇率信息
  if (routerResult.fromTokenAmount && routerResult.toTokenAmount) {
    try {
      const fromAmountDecimal = parseFloat(fromAtomicUnits(routerResult.fromTokenAmount, testConfig.fromToken));
      const toAmountDecimal = parseFloat(fromAtomicUnits(routerResult.toTokenAmount, testConfig.toToken));
      const rate = toAmountDecimal / fromAmountDecimal;
      
      console.log(`💱 汇率: 1 ${testConfig.fromSymbol} ≈ ${rate.toFixed(6)} ${testConfig.toSymbol}`);
    } catch (error) {
      console.log(`💱 汇率: 计算失败`);
    }
  }

  // DEX 信息
  if (routerResult.quoteCompareList && routerResult.quoteCompareList.length > 0) {
    const topDexes = routerResult.quoteCompareList.slice(0, 3);
    const dexNames = topDexes.map((dex: any) => dex.dexName).join(', ');
    console.log(`🏪 可用 DEX: ${dexNames}`);
  }

  // 最佳路由
  if (routerResult.dexRouterList && routerResult.dexRouterList.length > 0) {
    const bestRoute = routerResult.dexRouterList[0];
    if (bestRoute.subRouterList && bestRoute.subRouterList.length > 0) {
      const protocols = bestRoute.subRouterList[0].dexProtocol;
      if (protocols && protocols.length > 0) {
        const protocolName = protocols[0].dexName;
        console.log(`🎯 最佳路由: ${protocolName}`);
      }
    }
  }

  // Gas 费用
  if (routerResult.estimateGasFee) {
    const gasFee = fromAtomicUnits(routerResult.estimateGasFee, BSC_TOKEN_ADDRESSES.BNB);
    console.log(`⛽ 预估 Gas 费: ${gasFee} BNB`);
  }

  // 价格影响和滑点
  if (routerResult.priceImpactPercentage) {
    console.log(`📈 价格影响: ${routerResult.priceImpactPercentage}%`);
  }
  
  console.log(`🎯 滑点设置: ${testConfig.slippage}%`);
  console.log('='.repeat(60));
}

/**
 * 运行报价测试
 */
async function runQuoteTests(): Promise<void> {
  let successCount = 0;
  let totalCount = 0;

  console.log('🚀 开始 BSC 网络报价测试');
  console.log(`🌐 链 ID: ${chainId}`);
  console.log(`👛 测试钱包: ${WALLET_ADDRESS}`);
  console.log(`📝 测试用例数量: ${QUOTE_TESTS.length}`);

  for (const testConfig of QUOTE_TESTS) {
    totalCount++;
    
    try {
      console.log(`\n🧪 测试 ${totalCount}/${QUOTE_TESTS.length}: ${testConfig.fromSymbol} -> ${testConfig.toSymbol}`);
      
      // 添加延迟避免限速
      if (totalCount > 1) {
        console.log('⏱️ 等待 3 秒避免限速...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // 转换为原子单位
      const atomicAmount = toAtomicUnits(testConfig.amount, testConfig.fromToken);
      
      // 获取报价
      const quote = await getSwapQuote(
        testConfig.fromToken,
        testConfig.toToken,
        atomicAmount,
        WALLET_ADDRESS,
        testConfig.slippage
      );
      
      displayQuoteDetails(quote, testConfig);
      
      console.log(`✅ 测试 ${totalCount} 通过`);
      successCount++;
      
    } catch (error: any) {
      console.error(`❌ 测试 ${totalCount} 失败:`, error.message);
      
      if (error.message.includes('429')) {
        console.warn('⚠️ 触发限速，等待更长时间...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else if (error.message.includes('403')) {
        console.error('❌ 认证失败，停止测试');
        break;
      }
    }
  }

  console.log('\n📊 测试总结:');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失败: ${totalCount - successCount}/${totalCount}`);
  console.log(`📈 成功率: ${((successCount / totalCount) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 检查环境变量
    if (!process.env.OKX_API_KEY) {
      console.error('❌ 错误: 缺少 OKX API 配置，请检查 .env 文件');
      return;
    }
    
    if (!WALLET_ADDRESS || WALLET_ADDRESS === '0xYourWalletAddress') {
      console.error('❌ 错误: 请在 .env 文件中设置有效的钱包地址');
      return;
    }

    // 运行测试
    await runQuoteTests();
    
  } catch (error) {
    console.error('❌ 程序执行失败:', (error as Error).message);
    process.exit(1);
  }
}

// 处理未捕获的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});

// 运行主函数
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🏁 报价测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 程序执行失败:', error.message);
      process.exit(1);
    });
}

export {
  runQuoteTests,
  getSwapQuote,
  main
}; 