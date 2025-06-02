import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from '../config';
import { OKXDEXClient } from '../index';

const app = express();
const port = config.getWebPort();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// OKX DEX 客户端实例
let dexClient: OKXDEXClient;

try {
  dexClient = new OKXDEXClient();
} catch (error) {
  console.warn('Web服务器启动时无法初始化OKX客户端，请通过API设置配置');
}

// API 路由

/**
 * 设置完整配置 - 更新为BSC专用
 */
app.post('/api/config', async (req, res) => {
  try {
    const { 
      okxApiKey, 
      okxSecretKey, 
      okxPassphrase, 
      okxProjectId,
      rpcUrl,
      privateKey, 
      walletAddress 
    } = req.body;

    // 验证必需参数
    if (!okxApiKey || !okxSecretKey || !okxPassphrase || !okxProjectId || 
        !rpcUrl || !privateKey || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的配置参数'
      });
    }

    // 创建BSC专用客户端实例
    try {
      dexClient = new OKXDEXClient({
        okx: {
          apiKey: okxApiKey,
          secretKey: okxSecretKey,
          apiPassphrase: okxPassphrase,
          projectId: okxProjectId
        },
        evm: {
          rpcUrl: rpcUrl,
          walletAddress: walletAddress,
          privateKey: privateKey,
          chainId: '56' // 强制BSC链
        }
      });

      // 测试连接
      const isConnected = await dexClient.checkConnection();
      
      console.log('✅ BSC链客户端配置成功');
      
      res.json({
        success: true,
        message: 'BSC链配置设置成功',
        connected: isConnected,
        chainId: '56',
        chainName: 'BSC'
      });

    } catch (configError) {
      res.status(400).json({
        success: false,
        message: `配置错误: ${configError instanceof Error ? configError.message : '未知错误'}`
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '设置配置失败'
    });
  }
});

/**
 * 获取账户信息 - BSC专用
 */
app.get('/api/account', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '客户端未初始化，请先设置配置'
      });
    }

    // 获取BNB余额而不是ETH余额
    const bnbBalance = await dexClient.getETHBalance(); // 对于BSC，这实际上是BNB余额
    const isConnected = await dexClient.checkConnection();

    res.json({
      success: true,
      data: {
        bnbBalance: bnbBalance,
        ethBalance: bnbBalance, // 保持兼容性
        connected: isConnected,
        walletAddress: dexClient.getWalletAddress(),
        chainId: '56',
        chainName: 'BSC'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取账户信息失败'
    });
  }
});

/**
 * 获取支持的代币列表 - BSC专用
 */
app.get('/api/tokens', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '客户端未初始化，请先设置配置'
      });
    }

    const tokens = await dexClient.getSupportedTokens();
    
    console.log('📋 获取BSC代币列表成功');
    
    res.json({
      success: true,
      data: tokens,
      chainId: '56',
      chainName: 'BSC'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取代币列表失败'
    });
  }
});

/**
 * 获取交易报价 - 使用新的BSC实现
 */
app.post('/api/quote', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '请先配置 OKX DEX 客户端'
      });
    }

    const { fromTokenAddress, toTokenAddress, amount, slippage } = req.body;

    if (!fromTokenAddress || !toTokenAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: fromTokenAddress, toTokenAddress, amount'
      });
    }

    console.log('🔍 获取BSC交易报价...');

    const quote = await dexClient.getQuote({
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage: slippage || '0.5',
      chainIndex: '56', // 强制BSC链
      chainId: '56',
      userWalletAddress: req.body.userWalletAddress || dexClient.getWalletAddress()
    });

    console.log('✅ BSC报价获取成功');

    res.json({
      success: true,
      data: quote,
      chainId: '56',
      chainName: 'BSC'
    });

  } catch (error: any) {
    console.error('❌ 获取报价失败:', error);
    
    // 改进错误信息处理
    let errorMessage = error.message || '获取报价失败';
    if (errorMessage.includes('status code 401')) {
      errorMessage = 'API 认证失败：请检查 OKX API 配置信息（API Key、Secret Key、Passphrase、Project ID）是否正确';
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('网络')) {
      errorMessage = '网络连接失败：请检查 BSC RPC URL 和网络连接';
    } else if (errorMessage.includes('insufficient')) {
      errorMessage = '余额不足：请检查钱包余额是否充足';
    } else if (errorMessage.includes('Invalid Request Access uri')) {
      errorMessage = 'API权限不足：当前API配置无法访问该功能';
    }
    
    res.json({ 
      success: false, 
      message: errorMessage,
      code: error.response?.status || 500
    });
  }
});

/**
 * DEX路由分析 - 新增功能
 */
app.post('/api/analyze-route', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '请先配置 OKX DEX 客户端'
      });
    }

    const { fromTokenAddress, toTokenAddress, amount, slippage } = req.body;

    if (!fromTokenAddress || !toTokenAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: fromTokenAddress, toTokenAddress, amount'
      });
    }

    console.log('📊 开始DEX路由分析...');

    // 调用SwapAPI的新方法
    const swapAPI = (dexClient as any).swapAPI;
    const analysis = await swapAPI.analyzeDEXRoute({
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage: slippage || '0.5',
      chainIndex: '56',
      chainId: '56',
      userWalletAddress: req.body.userWalletAddress || dexClient.getWalletAddress()
    });

    console.log('✅ DEX路由分析完成');

    res.json({
      success: true,
      data: analysis,
      chainId: '56',
      chainName: 'BSC'
    });

  } catch (error: any) {
    console.error('❌ DEX路由分析失败:', error);
    res.json({
      success: false,
      message: error.message || 'DEX路由分析失败'
    });
  }
});

/**
 * 代币授权 - 使用新的Web3实现
 */
app.post('/api/approve', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({ 
        success: false, 
        message: '请先配置 OKX DEX 客户端' 
      });
    }

    console.log('📋 BSC代币授权请求:', JSON.stringify(req.body, null, 2));

    const { tokenAddress, amount } = req.body;

    if (!tokenAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: tokenAddress, amount'
      });
    }

    // 检查是否是BNB
    if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return res.json({
        success: false,
        message: 'BNB 不需要授权'
      });
    }

    const result = await dexClient.approveToken(tokenAddress, amount);

    console.log('✅ BSC授权结果:', JSON.stringify(result, null, 2));

    res.json({ 
      success: true, 
      data: result,
      chainId: '56',
      chainName: 'BSC'
    });
  } catch (error: any) {
    console.error('❌ BSC代币授权失败:', error);
    
    let errorMessage = error.message || '代币授权失败';
    if (errorMessage.includes('status code 401')) {
      errorMessage = 'API 认证失败：请检查 OKX API 配置信息是否正确';
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('网络')) {
      errorMessage = '网络连接失败：请检查 BSC RPC URL 和网络连接';
    } else if (errorMessage.includes('insufficient')) {
      errorMessage = 'Gas费不足：请确保钱包有足够的BNB支付Gas费';
    } else if (errorMessage.includes('already approved')) {
      errorMessage = '代币已经授权，可以直接进行交换';
    }
    
    res.json({ 
      success: false, 
      message: errorMessage,
      code: error.response?.status || 500
    });
  }
});

/**
 * 执行交换 - 使用新的Web3实现
 */
app.post('/api/swap', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({ 
        success: false, 
        message: '请先配置 OKX DEX 客户端' 
      });
    }

    console.log('🚀 执行BSC交换请求:', JSON.stringify(req.body, null, 2));

    const result = await dexClient.swap({
      fromTokenAddress: req.body.fromTokenAddress,
      toTokenAddress: req.body.toTokenAddress,
      amount: req.body.amount,
      slippage: req.body.slippage || '0.5',
      chainIndex: '56', // 强制BSC链
      chainId: '56',
      userWalletAddress: req.body.userWalletAddress || dexClient.getWalletAddress()
    });

    console.log('✅ BSC交换结果:', JSON.stringify(result, null, 2));

    res.json({ 
      success: true, 
      data: result,
      chainId: '56',
      chainName: 'BSC'
    });
  } catch (error: any) {
    console.error('❌ 执行BSC交换失败:', error);
    
    // 改进错误信息处理
    let errorMessage = error.message || '执行交换失败';
    if (errorMessage.includes('status code 401')) {
      errorMessage = 'API 认证失败：请检查 OKX API 配置信息是否正确';
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('网络')) {
      errorMessage = '网络连接失败：请检查 BSC RPC URL 和网络连接';
    } else if (errorMessage.includes('insufficient')) {
      errorMessage = '余额不足或Gas不足：请检查钱包BNB余额';
    } else if (errorMessage.includes('allowance')) {
      errorMessage = '代币授权不足：请先进行代币授权';
    } else if (errorMessage.includes('reverted')) {
      errorMessage = '交易执行失败：可能是滑点过大或流动性不足';
    }
    
    res.json({ 
      success: false, 
      message: errorMessage,
      code: error.response?.status || 500
    });
  }
});

/**
 * 追踪交易状态 - 使用新的Web3监控
 */
app.get('/api/track/:orderId', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '客户端未初始化，请先设置配置'
      });
    }

    const { orderId } = req.params;
    
    console.log(`🔍 追踪BSC交易状态: ${orderId}`);
    
    const result = await dexClient.trackTransaction(orderId);

    console.log(`✅ BSC交易状态查询完成: ${result.status}`);

    res.json({
      success: true,
      data: result,
      chainId: '56',
      chainName: 'BSC'
    });

  } catch (error) {
    console.error('❌ 追踪BSC交易失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '追踪交易失败'
    });
  }
});

/**
 * 获取代币余额 - BSC专用
 */
app.get('/api/balance/:tokenAddress', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '客户端未初始化，请先设置配置'
      });
    }

    const { tokenAddress } = req.params;
    
    console.log(`🔍 查询BSC代币余额: ${tokenAddress}`);
    
    let balance;
    if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      // 查询BNB余额
      balance = await dexClient.getETHBalance();
      console.log(`✅ BNB余额查询成功: ${balance}`);
    } else {
      // 查询代币余额
      balance = await dexClient.getTokenBalance(tokenAddress);
      console.log(`✅ 代币余额查询成功: ${balance}`);
    }

    res.json({
      success: true,
      data: { balance },
      chainId: '56',
      chainName: 'BSC'
    });

  } catch (error) {
    console.error('❌ 获取BSC余额失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取余额失败'
    });
  }
});

/**
 * 获取代币信息 - BSC专用
 */
app.get('/api/token-info/:address', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '客户端未初始化，请先设置配置'
      });
    }

    const { address } = req.params;
    
    // 验证地址格式
    if (!dexClient.isValidTokenAddress(address)) {
      return res.status(400).json({
        success: false,
        message: '无效的BSC代币地址格式'
      });
    }

    console.log(`🔍 查询BSC代币信息: ${address}`);

    const tokenInfo = await dexClient.getTokenInfo(address);
    
    console.log(`✅ BSC代币信息查询成功: ${tokenInfo.symbol}`);
    
    res.json({
      success: true,
      data: tokenInfo,
      chainId: '56',
      chainName: 'BSC'
    });

  } catch (error) {
    console.error('❌ 获取BSC代币信息失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取代币信息失败'
    });
  }
});

/**
 * 获取交易历史 - 新增BSC专用端点
 */
app.get('/api/transaction/:txHash', async (req, res) => {
  try {
    if (!dexClient) {
      return res.status(400).json({
        success: false,
        message: '客户端未初始化，请先设置配置'
      });
    }

    const { txHash } = req.params;
    
    console.log(`🔍 查询BSC交易历史: ${txHash}`);
    
    const history = await dexClient.getTransactionHistory(txHash);
    
    if (history) {
      console.log(`✅ BSC交易历史查询成功`);
      res.json({
        success: true,
        data: history,
        chainId: '56',
        chainName: 'BSC'
      });
    } else {
      res.json({
        success: false,
        message: '未找到交易记录'
      });
    }

  } catch (error) {
    console.error('❌ 获取BSC交易历史失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '获取交易历史失败'
    });
  }
});

/**
 * 验证OKX API配置 - 更新为使用正确的端点
 */
app.post('/api/validate-okx', async (req, res) => {
  try {
    const { okxApiKey, okxSecretKey, okxPassphrase, okxProjectId } = req.body;
    
    if (!okxApiKey || !okxSecretKey || !okxPassphrase || !okxProjectId) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的OKX API参数'
      });
    }

    // 创建临时认证管理器
    const { AuthManager } = await import('../auth');
    const authManager = new AuthManager({
      apiKey: okxApiKey,
      secretKey: okxSecretKey,
      apiPassphrase: okxPassphrase,
      projectId: okxProjectId
    });

    // 生成测试请求
    const timestamp = authManager.generateTimestamp();
    const method = 'GET';
    const requestPath = '/api/v5/dex/aggregator/supported/chain';
    const queryString = '';
    
    const headers = authManager.getHeaders(timestamp, method, requestPath, queryString);
    
    console.log('🔍 验证OKX API配置...');
    console.log('使用端点: https://www.okx.com/api/v5');
    
    // 发送测试请求到正确的OKX端点
    const axios = require('axios');
    const testResponse = await axios({
      method: 'GET',
      url: `https://www.okx.com${requestPath}`,
      headers: headers,
      timeout: 10000
    });

    console.log('✅ OKX API验证成功');

    res.json({
      success: true,
      message: 'OKX API 验证成功 - 可用于BSC交易',
      data: {
        supportedChains: testResponse.data.data?.length || 0,
        endpoint: 'https://www.okx.com/api/v5',
        chainFocus: 'BSC (Chain ID: 56)'
      }
    });

  } catch (error: any) {
    console.error('❌ OKX API验证失败:', error.message);

    let errorMessage = '验证失败';
    let debugInfo: any = {
      error: error.message,
      status: error.response?.status,
      endpoint: 'https://www.okx.com/api/v5'
    };

    if (error.response?.status === 401) {
      errorMessage = 'API认证失败 - 请检查API密钥配置';
      debugInfo.possibleCauses = [
        'API Key 不正确',
        'Secret Key 不正确', 
        'API Passphrase 不正确',
        'Project ID 不正确',
        'API权限不足'
      ];
    } else if (error.response?.status === 403) {
      errorMessage = 'API权限不足 - 请检查API权限设置';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = '网络连接失败 - 请检查网络连接';
    }

    res.json({
      success: false,
      message: errorMessage,
      debug: debugInfo,
      response: error.response?.data
    });
  }
});

// 提供前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 提供调试页面
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, '../../test/debug-frontend.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 OKX DEX BSC Web 界面运行在 http://localhost:${port}`);
  console.log('='.repeat(60));
  console.log('📋 API 端点列表:');
  console.log('  POST /api/config          - 设置BSC钱包配置');
  console.log('  GET  /api/account         - 获取BSC账户信息');
  console.log('  GET  /api/tokens          - 获取BSC支持的代币');
  console.log('  POST /api/quote           - 获取BSC交易报价');
  console.log('  POST /api/analyze-route   - 分析DEX路由信息 🆕');
  console.log('  POST /api/approve         - BSC代币授权');
  console.log('  POST /api/swap            - 执行BSC交换');
  console.log('  GET  /api/track/:orderId  - 追踪BSC交易');
  console.log('  GET  /api/balance/:token  - 获取BSC代币余额');
  console.log('  GET  /api/token-info/:addr- 获取BSC代币信息');
  console.log('  GET  /api/transaction/:tx - 获取BSC交易历史 🆕');
  console.log('  POST /api/validate-okx    - 验证OKX API配置');
  console.log('='.repeat(60));
  console.log('🔗 专注于BSC链 (Chain ID: 56)');
  console.log('🔧 使用Web3直接广播交易');
  console.log('📊 支持DEX路由分析功能');
  console.log('='.repeat(60));
}); 