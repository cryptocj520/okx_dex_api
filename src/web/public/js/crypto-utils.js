/**
 * 加密解密工具类
 */
class CryptoUtils {
    // 使用PBKDF2从密码生成密钥
    static async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        return window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // 加密数据
    static async encrypt(data, password) {
        try {
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const key = await this.deriveKey(password, salt);
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(JSON.stringify(data))
            );
            
            // 将salt、iv和加密数据组合
            const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            result.set(salt, 0);
            result.set(iv, salt.length);
            result.set(new Uint8Array(encrypted), salt.length + iv.length);
            
            return btoa(String.fromCharCode(...result));
        } catch (error) {
            throw new Error('加密失败: ' + error.message);
        }
    }
    
    // 解密数据
    static async decrypt(encryptedData, password) {
        try {
            const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
            
            const salt = data.slice(0, 16);
            const iv = data.slice(16, 28);
            const encrypted = data.slice(28);
            
            const key = await this.deriveKey(password, salt);
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            throw new Error('解密失败: 密码错误或数据损坏');
        }
    }
}

window.CryptoUtils = CryptoUtils; 