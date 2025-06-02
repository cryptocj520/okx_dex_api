import axios, { AxiosInstance } from 'axios';
import { AuthManager } from '../auth';
import { 
  OKXConfig, 
  SwapQuote, 
  SwapTransaction, 
  APIResponse, 
  TransactionTrackResult,
  TransactionStatus,
  SwapParams,
  ApprovalParams
} from '../types';

/**
 * OKX DEX API 客户端
 * 专注于BSC链的报价和交易数据获取
 */
export class OKXClient {
  private axios: AxiosInstance;
  private auth: AuthManager;
  private baseUrl: string;

  constructor(config: OKXConfig) {
    // 使用测试成功的API端点
    this.baseUrl = config.baseUrl || 'https://www.okx.com/api/v5';
    this.auth = new AuthManager(config);
    
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * 获取支持的链列表
   */
  public async getSupportedChains(): Promise<any[]> {
    const path = '/dex/aggregator/supported/chain';
    const fullPath = '/api/v5' + path;
    const timestamp = this.auth.generateTimestamp();
    const headers = this.auth.getHeaders(timestamp, 'GET', fullPath);

    const response = await this.axios.get(path, { headers });
    return this.handleResponse(response.data);
  }

  /**
   * 获取代币列表
   */
  public async getTokens(chainId: string): Promise<any[]> {
    const path = '/dex/aggregator/all-tokens';
    const fullPath = '/api/v5' + path;
    const params = { chainId };
    const queryString = '?' + new URLSearchParams(params).toString();
    
    const timestamp = this.auth.generateTimestamp();
    const headers = this.auth.getHeaders(timestamp, 'GET', fullPath, queryString);

    const response = await this.axios.get(path, { params, headers });
    return this.handleResponse(response.data);
  }

  /**
   * 获取交易报价 - 使用测试成功的实现
   */
  public async getQuote(params: SwapParams): Promise<SwapQuote> {
    const path = '/dex/aggregator/swap';
    const fullPath = '/api/v5' + path;
    
    // 确保使用BSC链ID
    const chainId = params.chainId || params.chainIndex || '56';
    
    const queryParams = {
      chainId: chainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      userWalletAddress: params.userWalletAddress,
      slippage: params.slippage || '0.5'
    };
    
    const cleanParams: Record<string, string> = {};
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanParams[key] = value;
      }
    });
    
    const queryString = new URLSearchParams(cleanParams).toString();
    const timestamp = this.auth.generateTimestamp();
    const headers = this.auth.getHeaders(timestamp, 'GET', fullPath, queryString ? '?' + queryString : '');

    console.log('🔍 OKX报价请求详情:');
    console.log(`链ID: ${chainId} (BSC)`);
    console.log(`交易对: ${queryParams.fromTokenAddress} → ${queryParams.toTokenAddress}`);
    console.log(`数量: ${queryParams.amount}`);
    console.log(`滑点: ${queryParams.slippage}`);

    const response = await this.axios.get(path, { 
      params: cleanParams, 
      headers 
    });
    
    const data = this.handleResponse(response.data);
    console.log('✅ 报价获取成功');
    return data[0] as SwapQuote;
  }

  /**
   * 获取授权交易数据
   */
  public async getApprovalTransaction(params: ApprovalParams & { chainId: string }): Promise<any> {
    const path = '/dex/aggregator/approve-transaction';
    const fullPath = '/api/v5' + path;
    
    // 确保使用BSC链ID
    const chainId = params.chainId || '56';
    
    const requestParams = {
      chainId: chainId,
      tokenContractAddress: params.tokenAddress,
      approveAmount: params.amount
    };
    
    const queryString = '?' + new URLSearchParams(requestParams).toString();
    const timestamp = this.auth.generateTimestamp();
    const headers = this.auth.getHeaders(timestamp, 'GET', fullPath, queryString);

    console.log('🔍 获取授权交易数据:', requestParams);

    const response = await this.axios.get(path, { 
      params: requestParams, 
      headers 
    });
    
    const data = this.handleResponse(response.data);
    console.log('✅ 授权交易数据获取成功');
    return data[0];
  }

  /**
   * 获取交换交易数据 - 使用测试成功的实现
   */
  public async getSwapTransaction(params: SwapParams): Promise<{
    routerResult: any;
    tx: SwapTransaction;
  }> {
    const path = '/dex/aggregator/swap';
    const fullPath = '/api/v5' + path;
    
    // 确保使用BSC链ID
    const chainId = params.chainId || params.chainIndex || '56';
    
    const queryParams = {
      chainId: chainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      userWalletAddress: params.userWalletAddress,
      slippage: params.slippage || '0.5'
    };
    
    const cleanParams: Record<string, string> = {};
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanParams[key] = value;
      }
    });
    
    const queryString = '?' + new URLSearchParams(cleanParams).toString();
    const timestamp = this.auth.generateTimestamp();
    const headers = this.auth.getHeaders(timestamp, 'GET', fullPath, queryString);

    console.log('🔍 获取交换交易数据:', queryParams);

    const response = await this.axios.get(path, { 
      params: cleanParams, 
      headers 
    });
    
    const data = this.handleResponse(response.data);
    console.log('✅ 交换交易数据获取成功');
    
    const responseData = data[0] as any;
    return {
      routerResult: responseData.routerResult,
      tx: responseData.tx
    };
  }

  /**
   * 获取Gas限制 - 保留但简化为BSC链
   */
  public async getGasLimit(
    fromAddress: string,
    toAddress: string,
    txAmount: string = '0',
    inputData: string = '',
    chainId: string = '56'
  ): Promise<string> {
    // 对于BSC链，使用固定的Gas限制估算
    // 这避免了复杂的API调用，基于我们的测试经验
    
    if (inputData && inputData.length > 10) {
      // 复杂交易（如DEX交换）
      return '300000';
    } else {
      // 简单交易（如代币授权）
      return '100000';
    }
  }

  /**
   * 监控交易状态 - 保留但标记可能需要替换
   * 如果此方法有问题，将被Web3方式替换
   */
  public async trackTransaction(
    orderId: string,
    chainId: string = '56',
    address: string
  ): Promise<TransactionTrackResult> {
    try {
      const path = '/dex/pre-transaction/track-transaction';
      const fullPath = '/api/v5' + path;
      const body = {
        orderId,
        chainIndex: chainId,
        address
      };

      const timestamp = this.auth.generateTimestamp();
      const bodyString = JSON.stringify(body);
      const headers = this.auth.getHeaders(timestamp, 'POST', fullPath, bodyString);

      const response = await this.axios.post(path, body, { headers });
      const data = this.handleResponse(response.data);
      
      return data[0] as TransactionTrackResult;
    } catch (error) {
      // 如果OKX监控失败，标记需要使用Web3替换
      console.warn('⚠️ OKX交易监控失败，建议使用Web3方式:', error);
      throw new Error('OKX交易监控不可用，需要使用Web3方式替换');
    }
  }

  /**
   * 获取交易历史 - 保留但简化
   */
  public async getTransactionHistory(
    chainId: string = '56',
    txHash: string
  ): Promise<any> {
    try {
      const path = '/dex/transaction/get-transaction-history';
      const fullPath = '/api/v5' + path;
      const params = {
        chainIndex: chainId,
        txHashList: [txHash]
      };

      const timestamp = this.auth.generateTimestamp();
      const bodyString = JSON.stringify(params);
      const headers = this.auth.getHeaders(timestamp, 'POST', fullPath, bodyString);

      const response = await this.axios.post(path, params, { headers });
      const data = this.handleResponse(response.data);
      
      return data[0];
    } catch (error) {
      console.warn('⚠️ OKX交易历史查询失败:', error);
      return null;
    }
  }

  /**
   * 错误处理 - 保持不变
   */
  private handleResponse<T>(response: APIResponse<T>): T[] {
    if (response.code !== '0') {
      throw new Error(`OKX API错误: ${response.msg} (代码: ${response.code})`);
    }
    return response.data;
  }
} 