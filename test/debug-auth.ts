import axios from 'axios';
import * as dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

// 加载环境变量
dotenv.config();

/**
 * 获取请求头
 */
function getHeaders(timestamp: string, method: string, requestPath: string, queryString = ""): any {
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE;
    const projectId = process.env.OKX_PROJECT_ID;

    if (!apiKey || !secretKey || !apiPassphrase || !projectId) {
        throw new Error("缺少必要的环境变量");
    }

    const stringToSign = timestamp + method + requestPath + queryString;
    console.log(`🔧 调试信息:`);
    console.log(`- timestamp: ${timestamp}`);
    console.log(`- method: ${method}`);
    console.log(`- requestPath: ${requestPath}`);
    console.log(`- queryString: ${queryString}`);
    console.log(`- stringToSign: ${stringToSign}`);
    
    const signature = CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA256(stringToSign, secretKey)
    );
    
    console.log(`- signature: ${signature}`);
    console.log(`- apiKey (前4位): ${apiKey.substring(0, 4)}...`);
    console.log(`- secretKey (前4位): ${secretKey.substring(0, 4)}...`);
    console.log(`- projectId: ${projectId}`);

    return {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": apiKey,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": apiPassphrase,
        "OK-ACCESS-PROJECT": projectId,
    };
}

/**
 * 检查环境变量配置
 */
function checkEnvironmentVariables(): boolean {
    console.log('🔍 检查环境变量配置...');
    
    const requiredVars = [
        'OKX_API_KEY',
        'OKX_SECRET_KEY', 
        'OKX_API_PASSPHRASE',
        'OKX_PROJECT_ID',
        'EVM_WALLET_ADDRESS'
    ];
    
    let allValid = true;
    
    for (const varName of requiredVars) {
        const value = process.env[varName];
        if (!value) {
            console.error(`❌ 缺少环境变量: ${varName}`);
            allValid = false;
        } else {
            console.log(`✅ ${varName}: ${value.substring(0, 4)}...`);
        }
    }
    
    return allValid;
}

/**
 * 测试基础连接
 */
async function testBasicConnection(): Promise<void> {
    console.log('\n🌐 测试基础网络连接...');
    
    const testUrls = [
        'https://beta.okex.org/api/v5/',
        'https://www.okx.com/api/v5/',
        'https://web3.okx.com/api/v5/'
    ];
    
    for (const url of testUrls) {
        try {
            const response = await axios.get(url, { timeout: 5000 });
            console.log(`✅ ${url} - 连接成功 (状态: ${response.status})`);
        } catch (error) {
            console.error(`❌ ${url} - 连接失败: ${(error as any).message}`);
        }
    }
}

/**
 * 测试不同的API端点
 */
async function testDifferentEndpoints(): Promise<void> {
    console.log('\n🔗 测试不同的API端点...');
    
    const endpoints = [
        {
            name: 'Beta 端点',
            baseUrl: 'https://beta.okex.org/api/v5/',
            path: 'dex/aggregator/swap'
        },
        {
            name: '生产端点',
            baseUrl: 'https://www.okx.com/api/v5/',
            path: 'dex/aggregator/swap'
        },
        {
            name: 'Web3 端点',
            baseUrl: 'https://web3.okx.com/api/v5/',
            path: 'dex/aggregator/swap'
        }
    ];
    
    const chainId = '8453';
    const params = {
        chainId: chainId,
        fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000000000000',
        userWalletAddress: process.env.EVM_WALLET_ADDRESS || '0x1234567890123456789012345678901234567890',
        slippage: '0.5'
    };
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n📡 测试 ${endpoint.name}...`);
            
            const url = `${endpoint.baseUrl}${endpoint.path}`;
            const timestamp = new Date().toISOString();
            const requestPath = `/api/v5/${endpoint.path}`;
            const queryString = "?" + new URLSearchParams(params).toString();
            
            console.log(`🔗 完整URL: ${url}${queryString}`);
            
            const headers = getHeaders(timestamp, 'GET', requestPath, queryString);
            
            const response = await axios.get(url, { 
                params, 
                headers,
                timeout: 10000 
            });
            
            console.log(`✅ ${endpoint.name} - 请求成功 (状态: ${response.status})`);
            console.log(`📊 响应代码: ${response.data.code}`);
            console.log(`📝 响应消息: ${response.data.msg || 'N/A'}`);
            
            if (response.data.data && response.data.data.length > 0) {
                console.log(`💰 获得报价数据`);
            }
            
        } catch (error: any) {
            console.error(`❌ ${endpoint.name} - 请求失败:`);
            
            if (error.response) {
                console.error(`   状态码: ${error.response.status}`);
                console.error(`   状态文本: ${error.response.statusText}`);
                console.error(`   响应数据:`, JSON.stringify(error.response.data, null, 2));
                
                // 特殊处理 403 错误
                if (error.response.status === 403) {
                    console.error(`   🚫 403错误通常表示:`);
                    console.error(`      - API 密钥无效`);
                    console.error(`      - 签名计算错误`);
                    console.error(`      - 时间戳不准确`);
                    console.error(`      - 项目ID不正确`);
                    console.error(`      - IP白名单限制`);
                }
            } else if (error.request) {
                console.error(`   网络错误: ${error.message}`);
            } else {
                console.error(`   其他错误: ${error.message}`);
            }
        }
        
        // 添加延迟避免限速
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

/**
 * 测试时间戳准确性
 */
function testTimestamp(): void {
    console.log('\n⏰ 检查时间戳...');
    
    const timestamp = new Date().toISOString();
    const timestampMs = Date.now();
    
    console.log(`📅 当前时间戳: ${timestamp}`);
    console.log(`🕐 毫秒时间戳: ${timestampMs}`);
    
    // 检查时间是否在合理范围内
    const now = Date.now();
    const parsed = Date.parse(timestamp);
    const diff = Math.abs(now - parsed);
    
    if (diff < 60000) { // 1分钟内
        console.log(`✅ 时间戳正常 (误差: ${diff}ms)`);
    } else {
        console.error(`❌ 时间戳异常 (误差: ${diff}ms)`);
    }
}

/**
 * 主调试函数
 */
async function runDebugTests(): Promise<void> {
    console.log('🔧 OKX API 认证调试工具');
    console.log('='.repeat(60));
    
    // 1. 检查环境变量
    const envValid = checkEnvironmentVariables();
    if (!envValid) {
        console.error('\n❌ 环境变量配置不完整，请检查 .env 文件');
        return;
    }
    
    // 2. 检查时间戳
    testTimestamp();
    
    // 3. 测试网络连接
    await testBasicConnection();
    
    // 4. 测试不同API端点
    await testDifferentEndpoints();
    
    console.log('\n📋 调试完成');
    console.log('='.repeat(60));
    console.log('💡 如果仍然遇到403错误，请检查:');
    console.log('   1. API密钥是否有DEX权限');
    console.log('   2. IP是否在白名单中');
    console.log('   3. 项目ID是否正确');
    console.log('   4. 密钥是否已过期');
}

// 运行调试
if (require.main === module) {
    runDebugTests()
        .then(() => {
            console.log('\n🏁 调试测试完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 调试测试失败:', error.message);
            process.exit(1);
        });
}

export { runDebugTests }; 