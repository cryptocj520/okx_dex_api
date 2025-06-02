#!/usr/bin/env node

// 测试金额转换功能
function parseUnits(value, decimals = 18) {
    if (!value || isNaN(value)) return '0';
    
    // 如果小数位数大于代币精度，截断
    const parts = value.toString().split('.');
    if (parts.length > 1 && parts[1].length > decimals) {
        const truncated = parts[0] + '.' + parts[1].slice(0, decimals);
        value = parseFloat(truncated);
    }
    
    // 转换为wei
    const factor = BigInt(10) ** BigInt(decimals);
    const integerPart = BigInt(Math.floor(value));
    const fractionalPart = value - Math.floor(value);
    
    const weiInteger = integerPart * factor;
    const weiFractional = BigInt(Math.round(fractionalPart * Number(factor)));
    
    return (weiInteger + weiFractional).toString();
}

console.log('=== 金额转换测试 ===');
console.log('1 ETH =', parseUnits('1', 18), 'wei');
console.log('0.1 ETH =', parseUnits('0.1', 18), 'wei');
console.log('0.001 ETH =', parseUnits('0.001', 18), 'wei');
console.log('100 USDT =', parseUnits('100', 6), 'units (6 decimals)');

console.log('\n=== 测试OKX API获取报价 ===');

const axios = require('axios');

async function testQuote() {
    try {
        // 测试用1个ETH换USDT
        const amount = parseUnits('1', 18); // 1 ETH in wei
        
        const response = await axios.post('http://localhost:3000/api/quote', {
            fromTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
            toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
            amount: amount,
            slippage: '0.5'
        });
        
        console.log('报价请求发送金额:', amount);
        console.log('报价响应:', response.data);
        
    } catch (error) {
        console.error('测试失败:', error.response?.data || error.message);
    }
}

testQuote(); 