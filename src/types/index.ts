/**
 * OKX DEX API 核心类型定义
 */

// 配置接口
export interface OKXConfig {
  apiKey: string;
  secretKey: string;
  apiPassphrase: string;
  projectId: string;
  baseUrl?: string;
}

export interface EVMConfig {
  rpcUrl: string;
  walletAddress: string;
  privateKey: string;
  chainId?: string;
}

export interface AppConfig {
  okx: OKXConfig;
  evm: EVMConfig;
  webPort?: number;
}

// 代币信息
export interface TokenInfo {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenUnitPrice: string;
  decimal: string;
  isHoneyPot: boolean;
  taxRate: string;
}

// 交易报价
export interface SwapQuote {
  chainId: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee: string;
  estimateGasFee: string;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  priceImpactPercentage: string;
  slippage: string;
}

// 交易数据
export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  maxPriorityFeePerGas?: string;
  minReceiveAmount: string;
  slippage: string;
}

// 交易结果
export interface SwapResult {
  success: boolean;
  txHash?: string;
  orderId?: string;
  error?: string;
  quote?: SwapQuote;
  transaction?: SwapTransaction;
}

// 交易参数
export interface SwapParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage?: string;
  userWalletAddress: string;
  chainIndex?: string;
  chainId?: string;
}

// 授权参数
export interface ApprovalParams {
  tokenAddress: string;
  amount: string;
}

// 交易状态
export enum TransactionStatus {
  PENDING = '1',
  SUCCESS = '2',
  FAILED = '3'
}

// 交易监控结果
export interface TransactionTrackResult {
  status: TransactionStatus;
  txHash?: string;
  failReason?: string;
  orderId: string;
}

// API响应基础结构
export interface APIResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

// 错误信息
export interface SwapError {
  code: string;
  message: string;
  details?: any;
} 