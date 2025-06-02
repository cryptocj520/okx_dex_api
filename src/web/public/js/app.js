/**
 * 主应用类
 */
class OKXDEXApp {
    constructor() {
        this.tokenInfoTimeouts = {};
        this.chainConfig = this.getChainConfig();
        this.currentChainId = '56'; // 默认BSC
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateChainConfig();
        
        // 检查是否有保存的配置
        if (ConfigManager.hasEncryptedConfig()) {
            ConfigManager.showUnlockInterface();
        } else {
            // 没有保存的配置时，设置动态默认值
            this.setDefaultValues();
            ConfigManager.showConfigInterface();
        }
        
        this.loadAccountInfo();
    }

    // 设置默认配置值
    async setDefaultValues() {
        try {
            // 获取最佳可用的RPC端点
            const bestRPC = await ConfigManager.selectBestRPCEndpoint();
            const rpcUrlInput = document.getElementById('rpcUrl');
            if (rpcUrlInput && !rpcUrlInput.value) {
                rpcUrlInput.value = bestRPC;
            }
            
            // 设置其他默认值
            const chainIdInput = document.getElementById('chainId');
            if (chainIdInput && !chainIdInput.value) {
                chainIdInput.value = '56'; // BSC链
            }
        } catch (error) {
            console.warn('设置默认值时出错:', error);
            // 如果获取最佳RPC失败，使用备用默认值
            const rpcUrlInput = document.getElementById('rpcUrl');
            if (rpcUrlInput && !rpcUrlInput.value) {
                rpcUrlInput.value = 'https://bsc-dataseed.binance.org/';
            }
        }
    }

    // 链配置信息
    getChainConfig() {
        return {
            '56': {
                name: 'BSC',
                nativeToken: {
                    symbol: 'BNB',
                    name: 'BNB',
                    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                    decimals: 18
                },
                rpcUrl: 'https://bsc-dataseed.binance.org/',
                commonTokens: [
                    { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955' },
                    { symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' },
                    { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
                    { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' }
                ]
            }
        };
    }

    // 绑定事件
    bindEvents() {
        // 金额输入变化
        const amountInput = document.getElementById('amount');
        const unitSelect = document.getElementById('amountUnit');
        if (amountInput) amountInput.addEventListener('input', () => this.updateAmountConversion());
        if (unitSelect) unitSelect.addEventListener('change', () => this.updateAmountConversion());

        // 链选择变化
        const chainSelect = document.getElementById('chainId');
        if (chainSelect) chainSelect.addEventListener('change', () => this.updateChainConfig());

        // 代币输入防抖
        const fromTokenInput = document.getElementById('fromToken');
        const toTokenInput = document.getElementById('toToken');
        if (fromTokenInput) {
            fromTokenInput.addEventListener('input', Utils.debounce(() => this.getTokenInfo('from'), 500));
        }
        if (toTokenInput) {
            toTokenInput.addEventListener('input', Utils.debounce(() => this.getTokenInfo('to'), 500));
        }
    }

    // 快速选择代币
    selectToken(type, address) {
        const inputId = type === 'from' ? 'fromToken' : 'toToken';
        document.getElementById(inputId).value = address;
        this.getTokenInfo(type, address);
    }

    // 获取代币信息
    async getTokenInfo(type, address = null) {
        const inputId = type === 'from' ? 'fromToken' : 'toToken';
        const infoId = type === 'from' ? 'fromTokenInfo' : 'toTokenInfo';
        
        if (!address) {
            address = document.getElementById(inputId).value;
        }
        
        const infoElement = document.getElementById(infoId);
        
        if (!address || address.length < 42) {
            infoElement.className = 'token-info';
            infoElement.innerHTML = '';
            return;
        }
        
        try {
            infoElement.className = 'token-info show';
            infoElement.innerHTML = '<span class="loading"></span>获取代币信息中...';
            
            const result = await APIClient.getTokenInfo(address);
            
            if (result.success) {
                infoElement.className = 'token-info show success';
                infoElement.innerHTML = `
                    <strong>${result.data.symbol}</strong> - ${result.data.name}<br>
                    <small>精度: ${result.data.decimals} 位</small>
                `;
            } else {
                infoElement.className = 'token-info show error';
                infoElement.innerHTML = `❌ ${result.message}`;
            }
        } catch (error) {
            infoElement.className = 'token-info show error';
            infoElement.innerHTML = `❌ 获取代币信息失败: ${error.message}`;
        }
    }

    // 更新金额转换显示
    updateAmountConversion() {
        const amountInput = document.getElementById('amount');
        const unitSelect = document.getElementById('amountUnit');
        const conversionDiv = document.getElementById('amountConversion');
        
        if (!amountInput || !unitSelect || !conversionDiv) return;
        
        const value = amountInput.value;
        const unit = unitSelect.value;
        
        if (!value || isNaN(value) || parseFloat(value) <= 0) {
            conversionDiv.textContent = '';
            return;
        }
        
        if (unit === 'ether') {
            const weiValue = Utils.parseUnits(value, 18);
            const weiNumber = BigInt(weiValue);
            if (weiNumber >= BigInt('1000000000000000000')) {
                const ethValue = Number(weiNumber) / 1e18;
                conversionDiv.textContent = `= ${ethValue.toExponential(2)} wei`;
            } else {
                conversionDiv.textContent = `= ${weiValue} wei`;
            }
        } else {
            const etherValue = Utils.formatUnits(value, 18);
            conversionDiv.textContent = `= ${etherValue} 代币单位`;
        }
    }

    // 更新链配置
    updateChainConfig() {
        const chainId = document.getElementById('chainId').value;
        this.currentChainId = chainId;
        const chainConfig = this.chainConfig[chainId];
        
        if (chainConfig) {
            this.updateNativeTokenButton(chainConfig);
        }
    }

    // 更新原生代币按钮
    updateNativeTokenButton(chainConfig) {
        const tokenButtons = document.querySelector('.token-buttons');
        if (tokenButtons && chainConfig) {
            tokenButtons.innerHTML = '';
            
            // 添加原生代币按钮
            const nativeButton = document.createElement('button');
            nativeButton.className = 'token-btn native-token-btn';
            nativeButton.textContent = chainConfig.nativeToken.symbol;
            nativeButton.onclick = () => this.selectToken('from', chainConfig.nativeToken.address);
            tokenButtons.appendChild(nativeButton);
            
            // 添加常用代币按钮
            chainConfig.commonTokens.forEach(token => {
                const button = document.createElement('button');
                button.className = 'token-btn';
                button.textContent = token.symbol;
                button.onclick = () => this.selectToken('from', token.address);
                tokenButtons.appendChild(button);
            });
        }
    }

    // 加载账户信息
    async loadAccountInfo() {
        const result = await APIClient.getAccountInfo();
        
        if (result.success) {
            document.getElementById('connectionStatus').textContent = result.data.connected ? '已连接' : '未连接';
            document.getElementById('connectionStatus').className = `status ${result.data.connected ? 'connected' : 'disconnected'}`;
            document.getElementById('ethBalance').textContent = result.data.ethBalance;
            document.getElementById('currentAddress').textContent = result.data.walletAddress;
        }
    }

    // 设置配置
    async setConfig() {
        const config = {
            okxApiKey: document.getElementById('okxApiKey').value,
            okxSecretKey: document.getElementById('okxSecretKey').value,
            okxPassphrase: document.getElementById('okxPassphrase').value,
            okxProjectId: document.getElementById('okxProjectId').value,
            rpcUrl: document.getElementById('rpcUrl').value,
            chainId: document.getElementById('chainId').value,
            walletAddress: document.getElementById('walletAddress').value,
            privateKey: document.getElementById('privateKey').value
        };

        const btn = document.querySelector('button[onclick="setConfigWithSave()"]');
        
        if (!btn.getAttribute('data-original-text')) {
            btn.setAttribute('data-original-text', btn.innerHTML);
        }
        
        const requiredFields = Object.values(config);
        if (requiredFields.some(field => !field)) {
            Utils.showResult('configResult', { success: false, message: '请填写所有配置项' }, false);
            return;
        }

        Utils.setLoading(btn);
        
        const result = await APIClient.setConfig(config);

        Utils.setLoading(btn, false);
        Utils.showResult('configResult', result);
        
        if (result.success) {
            this.loadAccountInfo();
        }
    }

    // 获取报价
    async getQuote() {
        if (!Utils.checkConfigurationReady()) {
            Utils.showResult('quoteResult', { 
                success: false, 
                message: '请先完成配置设置：填写完整的 OKX API 配置、网络配置和钱包信息，然后点击"设置配置"按钮' 
            }, false);
            return;
        }

        const fromTokenAddress = document.getElementById('fromToken').value;
        const toTokenAddress = document.getElementById('toToken').value;
        const amount = Utils.getFinalAmount();
        const slippage = document.getElementById('slippage').value;
        const chainId = document.getElementById('chainId').value;
        const btn = document.querySelector('button[onclick="getQuote()"]');
        
        if (!btn.getAttribute('data-original-text')) {
            btn.setAttribute('data-original-text', btn.innerHTML);
        }

        if (!fromTokenAddress || !toTokenAddress) {
            Utils.showResult('quoteResult', { success: false, message: '请选择要交换的代币' }, false);
            return;
        }

        if (!amount || amount === '0') {
            Utils.showResult('quoteResult', { success: false, message: '请输入有效的数量' }, false);
            return;
        }

        Utils.setLoading(btn);

        const result = await APIClient.getQuote({
            fromTokenAddress,
            toTokenAddress,
            amount,
            slippage,
            chainIndex: chainId,
            chainId: chainId,
            userWalletAddress: document.getElementById('walletAddress').value
        });

        Utils.setLoading(btn, false);
        Utils.showResult('quoteResult', result);
    }

    // 代币授权
    async approveToken() {
        if (!Utils.checkConfigurationReady()) {
            Utils.showResult('approveResult', { 
                success: false, 
                message: '请先完成配置设置' 
            }, false);
            return;
        }

        const fromTokenAddress = document.getElementById('fromToken').value;
        const amount = Utils.getFinalAmount();
        const btn = document.querySelector('button[onclick="approveToken()"]');
        
        if (!btn.getAttribute('data-original-text')) {
            btn.setAttribute('data-original-text', btn.innerHTML);
        }

        if (!fromTokenAddress) {
            Utils.showResult('approveResult', { success: false, message: '请选择要授权的代币' }, false);
            return;
        }

        if (fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
            Utils.showResult('approveResult', { success: false, message: 'BNB 不需要授权，可以直接交换' }, false);
            return;
        }

        if (!amount || amount === '0') {
            Utils.showResult('approveResult', { success: false, message: '请输入有效的授权数量' }, false);
            return;
        }

        if (!confirm('确定要授权代币吗？这将花费少量Gas费用。')) {
            return;
        }

        Utils.setLoading(btn);

        const result = await APIClient.approveToken({
            tokenAddress: fromTokenAddress,
            amount: amount
        });

        Utils.setLoading(btn, false);
        Utils.showResult('approveResult', result);
    }

    // 执行交换
    async executeSwap() {
        if (!Utils.checkConfigurationReady()) {
            Utils.showResult('swapResult', { 
                success: false, 
                message: '请先完成配置设置' 
            }, false);
            return;
        }

        const fromTokenAddress = document.getElementById('fromToken').value;
        const toTokenAddress = document.getElementById('toToken').value;
        const amount = Utils.getFinalAmount();
        const slippage = document.getElementById('slippage').value;
        const chainId = document.getElementById('chainId').value;
        const btn = document.querySelector('button[onclick="executeSwap()"]');
        
        if (!btn.getAttribute('data-original-text')) {
            btn.setAttribute('data-original-text', btn.innerHTML);
        }

        if (!amount || amount === '0') {
            Utils.showResult('swapResult', { success: false, message: '请输入有效的数量' }, false);
            return;
        }

        if (!confirm('确定要执行交换吗？这将花费真实的代币和Gas费用。')) {
            return;
        }

        Utils.setLoading(btn);

        const result = await APIClient.executeSwap({
            fromTokenAddress,
            toTokenAddress,
            amount,
            slippage,
            chainIndex: chainId,
            chainId: chainId,
            userWalletAddress: document.getElementById('walletAddress').value
        });

        Utils.setLoading(btn, false);
        Utils.showResult('swapResult', result);
        
        if (result.success && result.data && result.data.orderId) {
            document.getElementById('orderId').value = result.data.orderId;
        }
    }

    // 追踪交易
    async trackTransaction() {
        const orderId = document.getElementById('orderId').value;
        const btn = document.querySelector('button[onclick="trackTransaction()"]');
        
        if (!btn.getAttribute('data-original-text')) {
            btn.setAttribute('data-original-text', btn.innerHTML);
        }

        if (!orderId) {
            Utils.showResult('trackResult', { success: false, message: '请输入订单ID' }, false);
            return;
        }

        Utils.setLoading(btn);

        const result = await APIClient.trackTransaction(orderId);

        Utils.setLoading(btn, false);
        Utils.showResult('trackResult', result);
    }

    // 验证OKX API
    async validateOKXAPI() {
        const config = {
            okxApiKey: document.getElementById('okxApiKey').value,
            okxSecretKey: document.getElementById('okxSecretKey').value,
            okxPassphrase: document.getElementById('okxPassphrase').value,
            okxProjectId: document.getElementById('okxProjectId').value
        };

        const btn = document.querySelector('button[onclick="validateOKXAPI()"]');
        
        if (Object.values(config).some(field => !field)) {
            Utils.showResult('validateResult', { 
                success: false, 
                message: '请先填写完整的OKX API配置信息' 
            }, false);
            return;
        }
        
        if (!btn.getAttribute('data-original-text')) {
            btn.setAttribute('data-original-text', btn.innerHTML);
        }
        
        Utils.setLoading(btn);
        
        const result = await APIClient.validateOKXAPI(config);
        
        Utils.setLoading(btn, false);
        Utils.showResult('validateResult', result);
    }
}

// 全局应用实例
let app;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    app = new OKXDEXApp();
});

// 全局函数暴露（保持与HTML的兼容性）
window.selectToken = (type, address) => app.selectToken(type, address);
window.getQuote = () => app.getQuote();
window.approveToken = () => app.approveToken();
window.executeSwap = () => app.executeSwap();
window.trackTransaction = () => app.trackTransaction();
window.setConfigWithSave = () => app.setConfig();
window.loadAccountInfo = () => app.loadAccountInfo();
window.validateOKXAPI = () => app.validateOKXAPI();
window.updateChainConfig = () => app.updateChainConfig();

// 配置管理相关函数
window.testRPCConnection = async () => {
    const rpcUrl = document.getElementById('rpcUrl').value;
    const btn = document.querySelector('button[onclick="testRPCConnection()"]');
    const resultDiv = document.getElementById('rpcTestResult');
    
    if (!rpcUrl) {
        Utils.showResult('rpcTestResult', { success: false, message: '请输入RPC URL' }, false);
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading"></span>测试中...';
    btn.disabled = true;
    
    try {
        const isWorking = await ConfigManager.testRPCEndpoint(rpcUrl);
        
        if (isWorking) {
            Utils.showResult('rpcTestResult', { 
                success: true, 
                message: '✅ RPC端点连接成功，网络正常' 
            }, true);
        } else {
            // 尝试获取最佳备用端点
            const bestEndpoint = await ConfigManager.selectBestRPCEndpoint();
            Utils.showResult('rpcTestResult', { 
                success: false, 
                message: `❌ 当前RPC端点无法连接，建议使用: ${bestEndpoint}` 
            }, false);
            
            // 自动填入可用的端点
            if (bestEndpoint !== rpcUrl) {
                document.getElementById('rpcUrl').value = bestEndpoint;
            }
        }
    } catch (error) {
        Utils.showResult('rpcTestResult', { 
            success: false, 
            message: `❌ 测试失败: ${error.message}` 
        }, false);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.unlockConfig = async () => {
    const password = document.getElementById('unlockPassword').value;
    const btn = document.querySelector('button[onclick="unlockConfig()"]');
    
    if (!password) {
        Utils.showResult('unlockResult', { success: false, message: '请输入解锁密码' }, false);
        return;
    }
    
    Utils.setLoading(btn);
    
    try {
        const config = await ConfigManager.loadEncryptedConfig(password);
        
        // 异步填充表单并验证RPC端点
        await ConfigManager.fillForm(config);
        
        Utils.setLoading(btn, false);
        ConfigManager.showConfigInterface();
        document.getElementById('configControls').style.display = 'block';
        document.getElementById('unlockPassword').value = '';
        
        Utils.showResult('unlockResult', { 
            success: true, 
            message: `配置解锁成功！保存时间: ${new Date(config.savedAt).toLocaleString()}` 
        }, true);
        
        setTimeout(() => {
            document.getElementById('unlockResult').style.display = 'none';
        }, 3000);
        
    } catch (error) {
        Utils.setLoading(btn, false);
        Utils.showResult('unlockResult', { success: false, message: error.message }, false);
    }
};

window.showNewConfigForm = () => {
    if (confirm('这将清除当前保存的配置，确定要新建配置吗？')) {
        ConfigManager.clearEncryptedConfig();
        ConfigManager.showConfigInterface();
        document.getElementById('configControls').style.display = 'none';
    }
};

window.confirmClearConfig = () => {
    if (confirm('确定要清除保存的配置吗？此操作不可恢复！')) {
        ConfigManager.clearEncryptedConfig();
        ConfigManager.showConfigInterface();
        document.getElementById('configControls').style.display = 'none';
        Utils.showResult('unlockResult', { success: true, message: '配置已清除' }, true);
        setTimeout(() => {
            document.getElementById('unlockResult').style.display = 'none';
        }, 2000);
    }
};

window.lockConfig = () => {
    if (confirm('确定要锁定配置吗？需要重新输入密码才能解锁。')) {
        ConfigManager.lock();
    }
};

window.showSavePasswordDialog = () => {
    document.getElementById('savePasswordDialog').style.display = 'flex';
    document.getElementById('savePassword').focus();
};

window.closeSavePasswordDialog = () => {
    document.getElementById('savePasswordDialog').style.display = 'none';
    document.getElementById('savePassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('savePasswordResult').style.display = 'none';
};

window.confirmSaveConfig = async () => {
    const password = document.getElementById('savePassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!password || !confirmPassword) {
        Utils.showResult('savePasswordResult', { success: false, message: '请填写所有密码字段' }, false);
        return;
    }
    
    if (password.length < 8) {
        Utils.showResult('savePasswordResult', { success: false, message: '密码长度至少8位' }, false);
        return;
    }
    
    if (password !== confirmPassword) {
        Utils.showResult('savePasswordResult', { success: false, message: '两次输入的密码不一致' }, false);
        return;
    }
    
    const config = {
        okxApiKey: document.getElementById('okxApiKey').value,
        okxSecretKey: document.getElementById('okxSecretKey').value,
        okxPassphrase: document.getElementById('okxPassphrase').value,
        okxProjectId: document.getElementById('okxProjectId').value,
        rpcUrl: document.getElementById('rpcUrl').value,
        chainId: document.getElementById('chainId').value,
        walletAddress: document.getElementById('walletAddress').value,
        privateKey: document.getElementById('privateKey').value
    };
    
    try {
        const success = await ConfigManager.saveEncryptedConfig(config, password);
        
        if (success) {
            Utils.showResult('savePasswordResult', { 
                success: true, 
                message: '配置保存成功！已加密存储到本地。' 
            }, true);
            
            setTimeout(() => {
                window.closeSavePasswordDialog();
                document.getElementById('configControls').style.display = 'block';
            }, 2000);
        } else {
            Utils.showResult('savePasswordResult', { success: false, message: '保存配置失败' }, false);
        }
    } catch (error) {
        Utils.showResult('savePasswordResult', { success: false, message: '保存失败: ' + error.message }, false);
    }
}; 