import { Web3 } from 'web3';
import { EVMConfig } from '../types';

/**
 * 网络管理器
 */
export class NetworkManager {
  private web3: Web3;
  private config: EVMConfig;

  constructor(config: EVMConfig) {
    this.config = config;
    this.web3 = new Web3(config.rpcUrl);
  }

  /**
   * 获取Web3实例
   */
  public getWeb3(): Web3 {
    return this.web3;
  }

  /**
   * 获取EVM配置
   */
  public getEVMConfig(): EVMConfig {
    return this.config;
  }

  /**
   * 获取当前gas价格
   */
  public async getGasPrice(): Promise<bigint> {
    return await this.web3.eth.getGasPrice();
  }

  /**
   * 获取账户nonce
   */
  public async getNonce(address?: string): Promise<number> {
    const addr = address || this.config.walletAddress;
    const count = await this.web3.eth.getTransactionCount(addr, 'latest');
    return Number(count);
  }

  /**
   * 检查账户ETH余额
   */
  public async getETHBalance(address?: string): Promise<string> {
    const addr = address || this.config.walletAddress;
    const balance = await this.web3.eth.getBalance(addr);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  /**
   * 检查ERC20代币余额
   */
  public async getTokenBalance(tokenAddress: string, walletAddress?: string): Promise<bigint> {
    const addr = walletAddress || this.config.walletAddress;
    
    const tokenABI = [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function'
      }
    ];

    const tokenContract = new this.web3.eth.Contract(tokenABI, tokenAddress);
    const balance = await tokenContract.methods.balanceOf(addr).call();
    return BigInt(String(balance));
  }

  /**
   * 检查ERC20代币授权额度
   */
  public async checkAllowance(
    tokenAddress: string,
    spenderAddress: string,
    ownerAddress?: string
  ): Promise<bigint> {
    const owner = ownerAddress || this.config.walletAddress;
    
    const tokenABI = [
      {
        constant: true,
        inputs: [
          { name: '_owner', type: 'address' },
          { name: '_spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        type: 'function'
      }
    ];

    const tokenContract = new this.web3.eth.Contract(tokenABI, tokenAddress);
    const allowance = await tokenContract.methods.allowance(owner, spenderAddress).call();
    return BigInt(String(allowance));
  }

  /**
   * 签名并发送交易
   */
  public async signAndSendTransaction(txObject: any): Promise<string> {
    const signedTx = await this.web3.eth.accounts.signTransaction(
      txObject,
      this.config.privateKey
    );
    
    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
    return receipt.transactionHash as string;
  }

  /**
   * 等待交易确认
   */
  public async waitForTransaction(txHash: string, confirmations: number = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkTransaction = async () => {
        try {
          const receipt = await this.web3.eth.getTransactionReceipt(txHash);
          if (receipt) {
            resolve(receipt);
          } else {
            setTimeout(checkTransaction, 1000);
          }
        } catch (error) {
          reject(error);
        }
      };
      checkTransaction();
    });
  }

  /**
   * 获取链ID
   */
  public getChainId(): string {
    return this.config.chainId || '1';
  }

  /**
   * 检查网络连接
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.web3.eth.getBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取代币信息
   */
  public async getTokenInfo(tokenAddress: string): Promise<{
    symbol: string;
    name: string;
    decimals: number;
  }> {
    // ETH 特殊处理
    if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
      };
    }

    const tokenABI = [
      {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        type: 'function'
      },
      {
        constant: true,
        inputs: [],
        name: 'name',
        outputs: [{ name: '', type: 'string' }],
        type: 'function'
      },
      {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        type: 'function'
      }
    ];

    try {
      const tokenContract = new this.web3.eth.Contract(tokenABI, tokenAddress);
      
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.methods.symbol().call(),
        tokenContract.methods.name().call(),
        tokenContract.methods.decimals().call()
      ]);

      return {
        symbol: String(symbol),
        name: String(name),
        decimals: Number(decimals)
      };
    } catch (error) {
      throw new Error(`获取代币信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证代币地址格式
   */
  public isValidTokenAddress(address: string): boolean {
    if (!address) return false;
    
    // ETH 特殊地址
    if (address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return true;
    }
    
    // 普通ERC20地址验证
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
} 