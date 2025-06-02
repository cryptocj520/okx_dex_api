/**
 * API客户端类
 */
class APIClient {
    // API 调用函数
    static async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(endpoint, options);
            return await response.json();
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    // 获取代币信息
    static async getTokenInfo(address) {
        return await this.apiCall(`/api/token-info/${address}`);
    }

    // 获取账户信息
    static async getAccountInfo() {
        return await this.apiCall('/api/account');
    }

    // 设置配置
    static async setConfig(config) {
        return await this.apiCall('/api/config', 'POST', config);
    }

    // 获取报价
    static async getQuote(params) {
        return await this.apiCall('/api/quote', 'POST', params);
    }

    // 代币授权
    static async approveToken(params) {
        return await this.apiCall('/api/approve', 'POST', params);
    }

    // 执行交换
    static async executeSwap(params) {
        return await this.apiCall('/api/swap', 'POST', params);
    }

    // 追踪交易
    static async trackTransaction(orderId) {
        return await this.apiCall(`/api/track/${orderId}`);
    }

    // 验证OKX API
    static async validateOKXAPI(params) {
        return await this.apiCall('/api/validate-okx', 'POST', params);
    }
}

window.APIClient = APIClient; 