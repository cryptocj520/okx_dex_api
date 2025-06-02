import { Web3 } from 'web3';
import axios from 'axios';
import * as dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

// 加载环境变量
dotenv.config();

// 连接到 BSC 网络
const web3 = new Web3('https://bsc-dataseed1.binance.org/');

// 钱包信息 - 从环境变量读取
const WALLET_ADDRESS: string = process.env.EVM_WALLET_ADDRESS || '0xYourWalletAddress';
const PRIVATE_KEY: string = process.env.EVM_PRIVATE_KEY || 'YourPrivateKey';

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

// API URL - 使用不同端点
const dexBaseUrl: string = 'https://www.okx.com/api/v5/';        // DEX聚合器API
const web3BaseUrl: string = 'https://web3.okx.com/api/v5/';     // Web3相关API

// 交换配置：1 USDT -> WBNB
const SWAP_CONFIG = {
  fromToken: BSC_TOKEN_ADDRESSES.USDT,
  toToken: BSC_TOKEN_ADDRESSES.WBNB,
  fromSymbol: 'USDT',
  toSymbol: 'WBNB',
  amount: '1',  // 人类可读单位：1 USDT
  slippage: '0.5'  // 0.5% 滑点
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
 * 将人类可读数量转换为原子单位
 * @param amount - 人类可读的数量（如 "1"）
 * @param tokenAddress - 代币地址
 * @returns 原子单位的数量字符串
 */
function toAtomicUnits(amount: string, tokenAddress: string): string {
  // 获取代币的小数位数
  let decimals = 18; // 默认 18 位
  
  if (tokenAddress === BSC_TOKEN_ADDRESSES.USDT || tokenAddress === BSC_TOKEN_ADDRESSES.USDC) {
    decimals = 18; // BSC 上的 USDT 和 USDC 都是 18 位小数
  }
  
  // 转换为原子单位
  const atomicAmount = BigInt(parseFloat(amount) * Math.pow(10, decimals));
  return atomicAmount.toString();
}

/**
 * 将原子单位转换为人类可读数量
 * @param atomicAmount - 原子单位的数量
 * @param tokenAddress - 代币地址
 * @returns 人类可读的数量字符串
 */
function fromAtomicUnits(atomicAmount: string, tokenAddress: string): string {
  let decimals = 18; // 默认 18 位
  
  if (tokenAddress === BSC_TOKEN_ADDRESSES.USDT || tokenAddress === BSC_TOKEN_ADDRESSES.USDC) {
    decimals = 18; // BSC 上的 USDT 和 USDC 都是 18 位小数
  }
  
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
    const url = `${dexBaseUrl}${path}`;

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

    console.log(`🔍 获取交换报价: ${SWAP_CONFIG.fromSymbol} -> ${SWAP_CONFIG.toSymbol}`);
    console.log(`💰 交换数量: ${SWAP_CONFIG.amount} ${SWAP_CONFIG.fromSymbol}`);

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
    console.error('获取交换报价失败:', error.message);
    throw error;
  }
}

/**
 * 检查代币授权额度
 */
async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<bigint> {
  const tokenABI = [
    {
      "constant": true,
      "inputs": [
        { "name": "_owner", "type": "address" },
        { "name": "_spender", "type": "address" }
      ],
      "name": "allowance",
      "outputs": [{ "name": "", "type": "uint256" }],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
  try {
    const allowance = await tokenContract.methods.allowance(ownerAddress, spenderAddress).call();
    return BigInt(String(allowance));
  } catch (error) {
    console.error('查询授权额度失败:', error);
    throw error;
  }
}

/**
 * 获取授权交易数据
 */
async function getApproveTransaction(
  tokenAddress: string,
  amount: string
): Promise<any> {
  try {
    const path = 'dex/aggregator/approve-transaction';
    const url = `${dexBaseUrl}${path}`;
    const params = {
      chainId: chainId,
      tokenContractAddress: tokenAddress,
      approveAmount: amount
    };

    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5/${path}`;
    const queryString = "?" + new URLSearchParams(params).toString();
    const headers = getHeaders(timestamp, 'GET', requestPath, queryString);

    const response = await axios.get(url, { params, headers });

    if (response.data.code === '0') {
      return response.data.data[0];
    } else {
      throw new Error(`API 错误: ${response.data.msg || '未知错误'}`);
    }
  } catch (error) {
    console.error('获取授权交易数据失败:', (error as Error).message);
    throw error;
  }
}

/**
 * 广播交易 - 直接使用Web3广播到BSC网络
 */
async function broadcastTransaction(signedTx: string): Promise<string> {
  try {
    console.log('📡 直接广播交易到 BSC 网络...');
    
    // 直接使用 Web3 广播交易
    const receipt = await web3.eth.sendSignedTransaction(signedTx);
    console.log(`✅ 交易已广播到网络`);
    console.log(`🔗 交易哈希: ${receipt.transactionHash}`);
    console.log(`🌐 区块链浏览器: https://bscscan.com/tx/${receipt.transactionHash}`);
    
    return receipt.transactionHash as string;
  } catch (error) {
    console.error('广播交易失败:', error);
    throw error;
  }
}

/**
 * 监控交易状态 - 使用Web3直接查询BSC网络
 */
async function trackTransactionByHash(txHash: string): Promise<any> {
  console.log(`📡 监控交易状态，哈希: ${txHash}`);

  const maxAttempts = 60; // 最多等待 5 分钟
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // 使用 Web3 查询交易收据
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      
      if (receipt) {
        if (receipt.status) {
          console.log(`✅ 交易成功确认！`);
          console.log(`📦 区块号: ${receipt.blockNumber}`);
          console.log(`⛽ Gas 使用: ${receipt.gasUsed}`);
          return receipt;
        } else {
          console.error(`❌ 交易失败 - status: ${receipt.status}`);
          throw new Error('交易执行失败');
        }
      } else {
        console.log(`⏳ 等待交易确认... (${attempts + 1}/${maxAttempts})`);
      }

      // 等待 5 秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

    } catch (error: any) {
      if (error.message.includes('交易执行失败')) {
        throw error;
      }
      
      console.log(`⏳ 交易尚未确认，继续等待...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  throw new Error('交易监控超时');
}

/**
 * 显示交换详情
 */
function displaySwapDetails(quote: any): void {
  console.log('\n📊 交换详情:');
  console.log('='.repeat(60));
  
  const routerResult = quote.routerResult;
  if (!routerResult) {
    console.log('❌ 无法获取交换详情');
    return;
  }

  // 基本信息
  console.log(`🔄 交换对: ${SWAP_CONFIG.fromSymbol} -> ${SWAP_CONFIG.toSymbol}`);
  console.log(`📥 输入数量: ${SWAP_CONFIG.amount} ${SWAP_CONFIG.fromSymbol}`);
  
  if (routerResult.toTokenAmount) {
    const outputAmount = fromAtomicUnits(routerResult.toTokenAmount, SWAP_CONFIG.toToken);
    console.log(`📤 预期输出: ${outputAmount} ${SWAP_CONFIG.toSymbol}`);
  }

  // 汇率信息
  if (routerResult.fromTokenAmount && routerResult.toTokenAmount) {
    try {
      const fromAmountDecimal = parseFloat(fromAtomicUnits(routerResult.fromTokenAmount, SWAP_CONFIG.fromToken));
      const toAmountDecimal = parseFloat(fromAtomicUnits(routerResult.toTokenAmount, SWAP_CONFIG.toToken));
      const rate = toAmountDecimal / fromAmountDecimal;
      
      console.log(`💱 汇率: 1 ${SWAP_CONFIG.fromSymbol} ≈ ${rate.toFixed(6)} ${SWAP_CONFIG.toSymbol}`);
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
  
  console.log(`🎯 滑点设置: ${SWAP_CONFIG.slippage}%`);
  console.log('='.repeat(60));
}

/**
 * 执行代币交换
 */
async function executeSwap(): Promise<void> {
  try {
    console.log('🚀 开始执行 BSC 网络代币交换');
    console.log(`🔄 ${SWAP_CONFIG.amount} ${SWAP_CONFIG.fromSymbol} -> ${SWAP_CONFIG.toSymbol}`);
    
    // 1. 转换为原子单位
    const atomicAmount = toAtomicUnits(SWAP_CONFIG.amount, SWAP_CONFIG.fromToken);
    console.log(`🔢 原子单位数量: ${atomicAmount}`);

    // 2. 获取交换报价
    console.log('\n📋 步骤 1: 获取交换报价');
    const quote = await getSwapQuote(
      SWAP_CONFIG.fromToken,
      SWAP_CONFIG.toToken,
      atomicAmount,
      WALLET_ADDRESS,
      SWAP_CONFIG.slippage
    );
    
    displaySwapDetails(quote);

    // 3. 检查并处理代币授权
    console.log('\n🔐 步骤 2: 检查代币授权');
    const routerAddress = '0x9b9efa5Efa731EA9Bbb0369E91fA17Abf249CFD4'; // OKX DEX Router on BSC
    const currentAllowance = await checkAllowance(SWAP_CONFIG.fromToken, WALLET_ADDRESS, routerAddress);
    const requiredAmount = BigInt(atomicAmount);

    if (currentAllowance < requiredAmount) {
      console.log('❗ 需要授权代币...');
      
      // 获取授权交易数据
      const approveData = await getApproveTransaction(SWAP_CONFIG.fromToken, atomicAmount);
      
      // 构造授权交易
      const gasPrice = await web3.eth.getGasPrice();
      const nonce = await web3.eth.getTransactionCount(WALLET_ADDRESS, 'latest');
      
      const approveTx = {
        from: WALLET_ADDRESS,
        to: SWAP_CONFIG.fromToken,
        data: approveData.data,
        value: '0',
        gas: '100000', // 授权通常需要较少 gas
        gasPrice: gasPrice.toString(),
        nonce: nonce
      };

      // 签名并广播授权交易
      const signedApproveTx = await web3.eth.accounts.signTransaction(approveTx, PRIVATE_KEY);
      const rawTx = typeof signedApproveTx.rawTransaction === 'string' 
        ? signedApproveTx.rawTransaction 
        : web3.utils.bytesToHex(signedApproveTx.rawTransaction!);
      const approveTxHash = await broadcastTransaction(rawTx);
      
      console.log(`📡 授权交易已提交，哈希: ${approveTxHash}`);
      await trackTransactionByHash(approveTxHash);
      
      // 等待一下确保授权生效
      console.log('⏳ 等待授权生效...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      console.log('✅ 已有足够的代币授权');
    }

    // 4. 执行交换
    console.log('\n💱 步骤 3: 执行代币交换');
    const swapTx = quote.tx;
    
    // 获取当前 gas 价格和 nonce
    const gasPrice = await web3.eth.getGasPrice();
    const nonce = await web3.eth.getTransactionCount(WALLET_ADDRESS, 'latest');
    
    const txObject = {
      from: WALLET_ADDRESS,
      to: swapTx.to,
      data: swapTx.data,
      value: swapTx.value || '0',
      gas: swapTx.gas,
      gasPrice: gasPrice.toString(),
      nonce: nonce
    };

    // 签名并广播交换交易
    const signedSwapTx = await web3.eth.accounts.signTransaction(txObject, PRIVATE_KEY);
    const rawSwapTx = typeof signedSwapTx.rawTransaction === 'string' 
      ? signedSwapTx.rawTransaction 
      : web3.utils.bytesToHex(signedSwapTx.rawTransaction!);
    const swapTxHash = await broadcastTransaction(rawSwapTx);
    
    console.log(`📡 交换交易已提交，哈希: ${swapTxHash}`);
    
    // 5. 监控交易完成
    console.log('\n📡 步骤 4: 监控交易状态');
    const result = await trackTransactionByHash(swapTxHash);
    
    console.log('\n🎉 交换完成！');
    console.log(`💰 已将 ${SWAP_CONFIG.amount} ${SWAP_CONFIG.fromSymbol} 交换为 ${SWAP_CONFIG.toSymbol}`);
    
    return result;

  } catch (error) {
    console.error('❌ 交换失败:', (error as Error).message);
    throw error;
  }
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

    if (!PRIVATE_KEY || PRIVATE_KEY === 'YourPrivateKey') {
      console.error('❌ 错误: 请在 .env 文件中设置有效的私钥');
      return;
    }

    console.log('🌐 连接到 BSC 网络');
    console.log(`👛 钱包地址: ${WALLET_ADDRESS}`);
    console.log(`🔗 链 ID: ${chainId}`);
    
    // 执行交换
    await executeSwap();
    
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
      console.log('\n🏁 程序执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 程序执行失败:', error.message);
      process.exit(1);
    });
}

export {
  executeSwap,
  getSwapQuote,
  main
}; 