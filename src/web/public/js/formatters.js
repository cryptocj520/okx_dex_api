/**
 * 数据格式化工具类
 */
class Formatters {
    // 格式化Gas费显示
    static formatGasFee(gasFee) {
        const num = Number(gasFee);
        if (num === 0) return '0 BNB';
        
        const bnbValue = num / 1e18;
        if (bnbValue >= 0.01) {
            return `${bnbValue.toFixed(4)} BNB`;
        } else {
            return `${bnbValue.toExponential(2)} BNB`;
        }
    }

    // 格式化报价结果
    static formatQuoteResult(data) {
        console.log('前端接收到的报价数据:', data);
        
        if (!data) {
            return '❌ 未获取到报价数据';
        }

        // 从返回的数据中提取关键信息 - 修正数据路径
        let fromToken, toToken, fromTokenAmount, toTokenAmount, estimatedGas, priceImpact;
        
        // 检查是否有routerResult（新格式）
        if (data.routerResult) {
            fromToken = data.routerResult.fromToken;
            toToken = data.routerResult.toToken;
            fromTokenAmount = data.routerResult.fromTokenAmount;
            toTokenAmount = data.routerResult.toTokenAmount;
            estimatedGas = data.routerResult.estimateGasFee || '0';
            priceImpact = data.routerResult.priceImpactPercentage || '0';
        } else {
            // 兼容旧格式
            fromToken = data.fromToken;
            toToken = data.toToken;
            fromTokenAmount = data.fromTokenAmount;
            toTokenAmount = data.toTokenAmount;
            estimatedGas = data.estimateGasFee || '0';
            priceImpact = data.priceImpactPercentage || '0';
        }

        if (!fromToken || !toToken) {
            return '❌ 报价数据格式错误：缺少代币信息';
        }
        
        // 计算数量（从wei转换为代币单位）
        const fromAmount = fromTokenAmount ? (parseFloat(fromTokenAmount) / Math.pow(10, parseInt(fromToken.decimal || 18))).toFixed(6) : '0';
        const toAmount = toTokenAmount ? (parseFloat(toTokenAmount) / Math.pow(10, parseInt(toToken.decimal || 18))).toFixed(6) : '0';
        
        // 计算价格比率
        const fromAmountNum = parseFloat(fromAmount);
        const toAmountNum = parseFloat(toAmount);
        const price = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '0';
        
        // 显示DEX路由信息
        let routeInfo = '';
        const dexRouterList = data.routerResult?.dexRouterList || data.dexRouterList;
        if (dexRouterList && dexRouterList.length > 0) {
            const route = dexRouterList[0];
            if (route.subRouterList && route.subRouterList[0] && route.subRouterList[0].dexProtocol) {
                const dexName = route.subRouterList[0].dexProtocol[0]?.dexName || '未知DEX';
                routeInfo = `<div style="font-size: 0.75em; color: #666; margin-top: 4px;">通过 ${dexName} 路由</div>`;
            }
        }
        
        // 显示多个DEX比较信息
        let compareInfo = '';
        const quoteCompareList = data.routerResult?.quoteCompareList || data.quoteCompareList;
        if (quoteCompareList && quoteCompareList.length > 1) {
            compareInfo = `<div style="font-size: 0.75em; color: #666; margin-top: 4px;">比较了 ${quoteCompareList.length} 个DEX，选择最优路由</div>`;
        }
        
        return `
            <div style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 4px; padding: 8px; margin: 4px 0; font-size: 0.85em;">
                <div style="font-weight: bold; color: #2e7d32; margin-bottom: 6px;">💰 BSC链报价结果</div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span>支付: <strong>${fromAmount} ${fromToken.tokenSymbol}</strong></span>
                    <span style="color: #4caf50; margin: 0 8px;">→</span>
                    <span>获得: <strong style="color: #2e7d32;">${toAmount} ${toToken.tokenSymbol}</strong></span>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #666; border-top: 1px solid #c8e6c9; padding-top: 4px;">
                    <span>价格: 1 ${fromToken.tokenSymbol} = ${price} ${toToken.tokenSymbol}</span>
                    <span>价格影响: ${priceImpact}%</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.75em; color: #888; margin-top: 2px;">
                    <span>预估Gas: ${this.formatGasFee(estimatedGas)}</span>
                    <span>滑点容忍: ${data.slippage || '0.5'}%</span>
                </div>
                
                ${routeInfo}
                ${compareInfo}
            </div>
        `;
    }

    // 格式化交换结果
    static formatSwapResult(data) {
        console.log('前端接收到的交换结果:', data);
        
        if (!data) {
            return '❌ 没有返回交换数据';
        }

        if (data.success === true && data.txHash) {
            return `
                <div style="background: #d4edda; border: 1px solid #4caf50; border-radius: 4px; padding: 10px; margin: 4px 0;">
                    <div style="font-weight: bold; color: #2e7d32; margin-bottom: 8px;">🎉 BSC链交换成功！</div>
                    <div style="margin-bottom: 6px;">
                        <strong>交易哈希:</strong> <code style="background: #e8f5e8; padding: 2px 4px; border-radius: 2px; word-break: break-all; font-size: 0.8em;">${data.txHash}</code>
                    </div>
                    <div style="font-size: 0.85em; color: #666; border-top: 1px solid #c8e6c9; padding-top: 6px; margin-top: 8px;">
                        ✅ 交换已在BSC链上成功执行
                    </div>
                </div>
            `;
        } else if (data.success === false) {
            return `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 10px; margin: 4px 0;">
                    <div style="font-weight: bold; color: #721c24; margin-bottom: 6px;">❌ BSC链交换失败</div>
                    <div style="font-size: 0.85em; color: #666;">错误信息: ${data.error || '未知错误'}</div>
                </div>
            `;
        }

        return `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px; margin: 4px 0;">
                <div style="font-weight: bold; color: #856404; margin-bottom: 6px;">⚠️ 交换状态未知</div>
                <div style="font-size: 0.85em; color: #666;">没有收到明确的交换结果</div>
            </div>
        `;
    }

    // 格式化授权结果
    static formatApprovalResult(data) {
        console.log('前端接收到的授权结果:', data);
        
        if (!data) {
            return '❌ 没有返回授权数据';
        }

        if (data.needApproval === false) {
            return `
                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 10px; margin: 4px 0;">
                    <div style="font-weight: bold; color: #0c5460; margin-bottom: 6px;">ℹ️ BSC代币已经授权</div>
                    <div style="font-size: 0.85em; color: #666;">该代币已经有足够的授权额度，可以直接进行交换</div>
                </div>
            `;
        } else if (data.needApproval === true && data.txHash) {
            return `
                <div style="background: #d4edda; border: 1px solid #4caf50; border-radius: 4px; padding: 10px; margin: 4px 0;">
                    <div style="font-weight: bold; color: #2e7d32; margin-bottom: 8px;">✅ BSC链授权交易成功</div>
                    <div style="margin-bottom: 6px;">
                        <strong>交易哈希:</strong> <code style="background: #e8f5e8; padding: 2px 4px; border-radius: 2px; word-break: break-all; font-size: 0.8em;">${data.txHash}</code>
                    </div>
                    <div style="font-size: 0.85em; color: #666; border-top: 1px solid #c8e6c9; padding-top: 6px; margin-top: 8px;">
                        ✅ 代币授权已在BSC链上成功执行，现在可以进行交换
                    </div>
                </div>
            `;
        }

        return `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px; margin: 4px 0;">
                <div style="font-weight: bold; color: #856404; margin-bottom: 6px;">⚠️ 授权状态未知</div>
                <div style="font-size: 0.85em; color: #666;">授权结果不明确，请检查钱包或重新尝试</div>
            </div>
        `;
    }
}

window.Formatters = Formatters; 