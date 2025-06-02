import * as dotenv from 'dotenv';
import { AppConfig, OKXConfig, EVMConfig } from '../types';

// 加载环境变量
dotenv.config();

/**
 * 配置管理类
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfig(): AppConfig {
    // 验证必须的环境变量
    const requiredEnvVars = [
      'OKX_API_KEY',
      'OKX_SECRET_KEY',
      'OKX_API_PASSPHRASE',
      'OKX_PROJECT_ID',
      'EVM_RPC_URL',
      'EVM_WALLET_ADDRESS',
      'EVM_PRIVATE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`缺少必需的环境变量: ${envVar}`);
      }
    }

    const okxConfig: OKXConfig = {
      apiKey: process.env.OKX_API_KEY!,
      secretKey: process.env.OKX_SECRET_KEY!,
      apiPassphrase: process.env.OKX_API_PASSPHRASE!,
      projectId: process.env.OKX_PROJECT_ID!,
      baseUrl: process.env.API_BASE_URL || 'https://web3.okx.com/api/v5'
    };

    const evmConfig: EVMConfig = {
      rpcUrl: process.env.EVM_RPC_URL!,
      walletAddress: process.env.EVM_WALLET_ADDRESS!,
      privateKey: process.env.EVM_PRIVATE_KEY!,
      chainId: process.env.CHAIN_ID || '1'
    };

    return {
      okx: okxConfig,
      evm: evmConfig,
      webPort: parseInt(process.env.WEB_PORT || '3000', 10)
    };
  }

  /**
   * 获取OKX配置
   */
  public getOKXConfig(): OKXConfig {
    return this.config.okx;
  }

  /**
   * 获取EVM配置
   */
  public getEVMConfig(): EVMConfig {
    return this.config.evm;
  }

  /**
   * 获取Web端口
   */
  public getWebPort(): number {
    return this.config.webPort || 3000;
  }

  /**
   * 获取完整配置
   */
  public getConfig(): AppConfig {
    return this.config;
  }

  /**
   * 从外部设置私钥 (支持外部程序传入)
   */
  public setPrivateKey(privateKey: string): void {
    this.config.evm.privateKey = privateKey;
  }

  /**
   * 从外部设置钱包地址
   */
  public setWalletAddress(address: string): void {
    this.config.evm.walletAddress = address;
  }

  /**
   * 验证配置是否完整
   */
  public validateConfig(): boolean {
    try {
      const { okx, evm } = this.config;
      
      // 验证OKX配置
      if (!okx.apiKey || !okx.secretKey || !okx.apiPassphrase || !okx.projectId) {
        return false;
      }

      // 验证EVM配置
      if (!evm.rpcUrl || !evm.walletAddress || !evm.privateKey) {
        return false;
      }

      // 验证地址格式
      if (!evm.walletAddress.startsWith('0x') || evm.walletAddress.length !== 42) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

// 导出单例实例
export const config = ConfigManager.getInstance(); 