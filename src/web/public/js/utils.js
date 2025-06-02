/**
 * 工具函数类
 */
class Utils {
    // 金额转换工具函数
    static parseUnits(value, decimals = 18) {
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

    static formatUnits(value, decimals = 18) {
        if (!value || value === '0') return '0';
        
        const factor = BigInt(10) ** BigInt(decimals);
        const bigValue = BigInt(value);
        
        const integerPart = bigValue / factor;
        const fractionalPart = bigValue % factor;
        
        const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
        const trimmed = fractionalStr.replace(/0+$/, '');
        
        if (trimmed === '') {
            return integerPart.toString();
        } else {
            return integerPart.toString() + '.' + trimmed;
        }
    }

    // 获取最终的wei金额
    static getFinalAmount() {
        const amountInput = document.getElementById('amount');
        const unitSelect = document.getElementById('amountUnit');
        
        if (!amountInput || !unitSelect) return '0';
        
        const value = amountInput.value;
        const unit = unitSelect.value;
        
        if (!value || isNaN(value) || parseFloat(value) <= 0) return '0';
        
        if (unit === 'ether') {
            return this.parseUnits(value, 18);
        } else {
            return value; // 已经是wei
        }
    }

    // 显示加载状态
    static setLoading(buttonElement, loading = true) {
        if (loading) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span class="loading"></span>处理中...';
        } else {
            buttonElement.disabled = false;
            buttonElement.innerHTML = buttonElement.getAttribute('data-original-text') || '执行';
        }
    }

    // 显示结果
    static showResult(elementId, result, isSuccess = null) {
        const element = document.getElementById(elementId);
        const success = isSuccess !== null ? isSuccess : result.success;
        
        element.className = `result ${success ? 'success' : 'error'}`;
        element.style.display = 'block';
        
        if (typeof result === 'object') {
            let displayContent = '';
            
            if (!success && result.message) {
                if (result.message.includes('请先配置') || result.message.includes('客户端未初始化')) {
                    displayContent = `⚠️ 请先完成配置设置 - 填写并保存OKX API和钱包配置信息`;
                } else if (result.message.includes('status code 401') || result.message.includes('API认证失败')) {
                    displayContent = `❌ API认证失败 - 请检查OKX API配置信息是否正确`;
                } else {
                    displayContent = `❌ ${result.message}`;
                }
            } else if (success && result.data) {
                if (elementId === 'quoteResult') {
                    displayContent = Formatters.formatQuoteResult(result.data);
                } else if (elementId === 'swapResult') {
                    displayContent = Formatters.formatSwapResult(result.data);
                } else if (elementId === 'approveResult') {
                    displayContent = Formatters.formatApprovalResult(result.data);
                } else {
                    displayContent = `✅ 操作成功`;
                }
            } else {
                displayContent = `<pre style="max-height: 150px; overflow-y: auto; font-size: 0.8em;">${JSON.stringify(result, null, 2)}</pre>`;
            }
            
            element.innerHTML = displayContent;
        } else {
            element.textContent = result;
        }
    }

    // 检查配置是否已设置
    static checkConfigurationReady() {
        const requiredFields = ['okxApiKey', 'okxSecretKey', 'okxPassphrase', 'okxProjectId', 
                               'rpcUrl', 'chainId', 'walletAddress', 'privateKey'];
        
        return requiredFields.every(field => {
            const element = document.getElementById(field);
            return element && element.value.trim();
        });
    }

    // 防抖函数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

window.Utils = Utils; 