import { OKXClient } from '../core/okx-client';
import { NetworkManager } from '../network';
import { 
  SwapParams, 
  SwapResult, 
  ApprovalParams, 
  TransactionStatus,
  SwapQuote,
  SwapTransaction 
} from '../types';

/**
 * 高级交换API - 使用Web3直接广播的BSC专用实现
 */
export class SwapAPI {
  private okxClient: OKXClient;
  private networkManager: NetworkManager;
  private chainId: string;

  // BSC链上的OKX DEX路由合约地址
  private readonly OKX_ROUTER_ADDRESS = '0x9b9efa5Efa731EA9Bbb0369E91fA17Abf249CFD4';

  constructor(okxClient: OKXClient, networkManager: NetworkManager) {
    this.okxClient = okxClient;
    this.networkManager = networkManager;
    this.chainId = this.networkManager.getChainId() || '56'; // 默认BSC
  }

  /**
   * 获取交易报价
   * @param params 交易参数
   * @returns 交易报价信息
   */
  public async getQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      const quoteParams = {
        ...params,
        chainIndex: '56', // 强制使用BSC链
        chainId: '56',
        userWalletAddress: params.userWalletAddress || this.networkManager.getEVMConfig().walletAddress,
        slippage: params.slippage || '0.5'
      };

      console.log('🔍 获取BSC链报价...');
      const quote = await this.okxClient.getQuote(quoteParams);
      
      // 添加DEX路由信息（如果可用）
      if ((quote as any).routerResult) {
        console.log('📊 DEX路由信息:');
        const routerResult = (quote as any).routerResult;
        if (routerResult.dexRouterList) {
          routerResult.dexRouterList.forEach((route: any, index: number) => {
            console.log(`路由 ${index + 1}: ${route.percentage || 100}%`);
            if (route.subRouterList) {
              route.subRouterList.forEach((subRoute: any) => {
                if (subRoute.dexProtocol) {
                  subRoute.dexProtocol.forEach((protocol: any) => {
                    console.log(`  └─ ${protocol.dexName} (${protocol.dexAddress})`);
                  });
                }
              });
            }
          });
        }
      }
      
      return quote;
    } catch (error) {
      throw new Error(`获取报价失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查并执行代币授权 - 使用Web3直接广播
   * @param params 授权参数
   * @returns 是否需要授权以及授权结果
   */
  public async approveToken(params: ApprovalParams): Promise<{
    needApproval: boolean;
    txHash?: string;
    orderId?: string;
  }> {
    try {
      // BNB不需要授权
      if (params.tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return { needApproval: false };
      }

      const walletAddress = this.networkManager.getEVMConfig().walletAddress;
      const web3 = this.networkManager.getWeb3();

      console.log('🔍 检查代币授权状态...');

      // 检查当前授权额度
      const currentAllowance = await this.networkManager.checkAllowance(
        params.tokenAddress,
        this.OKX_ROUTER_ADDRESS,
        walletAddress
      );

      const requiredAmount = BigInt(params.amount);

      if (currentAllowance >= requiredAmount) {
        console.log('✅ 代币已充分授权');
        return { needApproval: false };
      }

      console.log('⚠️ 需要授权代币，获取授权交易数据...');

      // 获取授权交易数据
      const approvalData = await this.okxClient.getApprovalTransaction({
        ...params,
        chainId: '56'
      });

      // 构建授权交易
      const gasPrice = await this.networkManager.getGasPrice();
      const nonce = await this.networkManager.getNonce();

      const txObject = {
        from: walletAddress,
        to: params.tokenAddress,
        data: approvalData.data,
        value: '0',
        gas: '100000', // 授权交易的固定Gas限制
        gasPrice: (gasPrice * BigInt(12) / BigInt(10)).toString(), // 1.2倍gas价格
        nonce
      };

      console.log('📝 签名授权交易...');

      // 签名交易
      const signedTx = await web3.eth.accounts.signTransaction(
        txObject,
        this.networkManager.getEVMConfig().privateKey
      );

      console.log('📡 广播授权交易...');

      // 使用Web3直接广播
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

      console.log(`✅ 授权交易成功: ${receipt.transactionHash}`);

      return {
        needApproval: true,
        txHash: receipt.transactionHash.toString(),
        orderId: receipt.transactionHash.toString() // 使用txHash作为orderId
      };

    } catch (error) {
      throw new Error(`代币授权失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 执行代币交换 - 使用Web3直接广播
   * @param params 交换参数
   * @returns 交换结果
   */
  public async executeSwap(params: SwapParams): Promise<SwapResult> {
    try {
      const walletAddress = this.networkManager.getEVMConfig().walletAddress;
      const web3 = this.networkManager.getWeb3();
      
      console.log('🚀 开始执行BSC链代币交换...');

      // 1. 检查并执行授权（如果需要）
      if (params.fromTokenAddress.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        console.log('📋 检查代币授权...');
        await this.approveToken({
          tokenAddress: params.fromTokenAddress,
          amount: params.amount
        });
      }

      // 2. 获取交换数据
      const swapParams = {
        ...params,
        chainIndex: '56', // 强制BSC链
        chainId: '56',
        userWalletAddress: params.userWalletAddress || walletAddress,
        slippage: params.slippage || '0.5'
      };

      console.log('📊 获取交换交易数据...');
      const swapData = await this.okxClient.getSwapTransaction(swapParams);
      const { routerResult: quote, tx: txData } = swapData;

      // 3. 构建交换交易
      const gasPrice = await this.networkManager.getGasPrice();
      const nonce = await this.networkManager.getNonce();

      const txObject = {
        from: walletAddress,
        to: txData.to,
        data: txData.data,
        value: txData.value || '0',
        gas: '300000', // 交换交易的固定Gas限制
        gasPrice: (gasPrice * BigInt(12) / BigInt(10)).toString(), // 1.2倍gas价格
        nonce
      };

      console.log('📝 签名交换交易...');

      // 4. 签名交易
      const signedTx = await web3.eth.accounts.signTransaction(
        txObject,
        this.networkManager.getEVMConfig().privateKey
      );

      console.log('📡 广播交换交易...');

      // 5. 使用Web3直接广播
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

      console.log(`✅ 交换交易成功: ${receipt.transactionHash}`);

      // 6. 等待确认
      console.log('⏳ 等待交易确认...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalReceipt = await web3.eth.getTransactionReceipt(receipt.transactionHash);

      return {
        success: Number(finalReceipt.status) === 1,
        txHash: receipt.transactionHash.toString(),
        orderId: receipt.transactionHash.toString(),
        quote: quote,
        transaction: txData
      };

    } catch (error) {
      console.error('❌ 交换执行失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '交换失败'
      };
    }
  }

  /**
   * 监控交易状态 - 使用Web3方式替换OKX监控
   * @param orderId 交易哈希（在我们的实现中就是txHash）
   * @param maxAttempts 最大重试次数
   * @param intervalMs 重试间隔
   * @returns 交易状态
   */
  public async monitorTransaction(
    orderId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<{
    status: TransactionStatus;
    txHash?: string;
    failReason?: string;
  }> {
    const web3 = this.networkManager.getWeb3();
    const txHash = orderId; // 在我们的实现中，orderId就是txHash

    console.log(`🔍 监控交易状态: ${txHash}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        
        if (receipt) {
          const success = Number(receipt.status) === 1;
          console.log(`✅ 交易${success ? '成功' : '失败'}: ${txHash}`);
          
          return {
            status: success ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
            txHash: txHash,
            failReason: success ? undefined : '交易执行失败'
          };
        }

        // 如果还没有确认，等待后重试
        if (attempt < maxAttempts) {
          console.log(`⏳ 等待交易确认... (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.warn(`⚠️ 查询交易状态失败 (尝试 ${attempt}/${maxAttempts}):`, error);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }

    // 超时未确认
    console.log('⏰ 交易监控超时');
    return {
      status: TransactionStatus.PENDING,
      txHash: txHash,
      failReason: '交易确认超时'
    };
  }

  /**
   * 获取支持的代币列表
   */
  public async getSupportedTokens(): Promise<any[]> {
    try {
      return await this.okxClient.getTokens('56'); // BSC链
    } catch (error) {
      console.warn('获取代币列表失败:', error);
      return [];
    }
  }

  /**
   * 获取支持的链列表
   */
  public async getSupportedChains(): Promise<any[]> {
    try {
      return await this.okxClient.getSupportedChains();
    } catch (error) {
      console.warn('获取链列表失败:', error);
      return [];
    }
  }

  /**
   * 获取交易历史
   */
  public async getTransactionHistory(txHash: string): Promise<any> {
    try {
      // 优先使用Web3查询
      const web3 = this.networkManager.getWeb3();
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      
      if (receipt) {
        return {
          txHash: receipt.transactionHash.toString(),
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          from: receipt.from.toString(),
          to: receipt.to?.toString()
        };
      }

      // 如果Web3查询失败，尝试OKX API
      return await this.okxClient.getTransactionHistory('56', txHash);
    } catch (error) {
      console.warn('获取交易历史失败:', error);
      return null;
    }
  }

  /**
   * 分析DEX路由信息 - 新增功能
   */
  public async analyzeDEXRoute(params: SwapParams): Promise<{
    bestRoute: any;
    allRoutes: any[];
    riskAssessment: string;
  }> {
    try {
      const quote = await this.getQuote(params);
      const routerResult = (quote as any).routerResult;

      if (!routerResult) {
        throw new Error('无法获取路由信息');
      }

      const analysis = {
        bestRoute: routerResult.dexRouterList?.[0] || null,
        allRoutes: routerResult.quoteCompareList || [],
        riskAssessment: this.assessTransactionRisk(routerResult)
      };

      console.log('📊 DEX路由分析完成');
      return analysis;
    } catch (error) {
      throw new Error(`DEX路由分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 评估交易风险
   */
  private assessTransactionRisk(routerResult: any): string {
    let risk = '低风险';
    
    try {
      // 检查价格影响
      const priceImpact = parseFloat(routerResult.priceImpactPercentage || '0');
      if (priceImpact > 5) {
        risk = '高风险';
      } else if (priceImpact > 1) {
        risk = '中等风险';
      }

      // 检查DEX数量
      const dexCount = routerResult.dexRouterList?.length || 1;
      if (dexCount > 2) {
        risk = risk === '低风险' ? '中等风险' : '高风险';
      }
    } catch (error) {
      console.warn('风险评估失败:', error);
    }

    return risk;
  }

  /**
   * 获取BSC DEX路由器地址
   */
  private getDEXRouterAddress(): string {
    return this.OKX_ROUTER_ADDRESS;
  }
} 