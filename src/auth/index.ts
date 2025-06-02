import * as CryptoJS from 'crypto-js';
import { OKXConfig } from '../types';

/**
 * OKX API 认证管理器
 */
export class AuthManager {
  private config: OKXConfig;

  constructor(config: OKXConfig) {
    this.config = config;
  }

  /**
   * 生成API请求头
   * @param timestamp ISO时间戳
   * @param method HTTP方法
   * @param requestPath 请求路径
   * @param queryString 查询字符串或请求体
   */
  public getHeaders(
    timestamp: string,
    method: string,
    requestPath: string,
    queryString: string = ''
  ): Record<string, string> {
    const stringToSign = timestamp + method + requestPath + queryString;
    
    const signature = CryptoJS.enc.Base64.stringify(
      CryptoJS.HmacSHA256(stringToSign, this.config.secretKey)
    );

    return {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.config.apiPassphrase,
      'OK-ACCESS-PROJECT': this.config.projectId,
    };
  }

  /**
   * 生成当前时间戳
   */
  public generateTimestamp(): string {
    // 根据官方curl示例，使用ISO 8601格式
    // 例如：2023-10-18T12:21:41.274Z
    return new Date().toISOString();
  }

  /**
   * 验证配置有效性
   */
  public validateConfig(): boolean {
    const { apiKey, secretKey, apiPassphrase, projectId } = this.config;
    return !!(apiKey && secretKey && apiPassphrase && projectId);
  }
} 