import { HandlerEvent } from '@netlify/functions';
import { MiddlewareResult } from '../types/api.types';
import { config } from '../utils/config';

class AuthMiddleware {
  
  // 验证API密钥
  public async validate(event: HandlerEvent): Promise<MiddlewareResult> {
    const apiKey = config.getApiSecretKey();
    
    // 如果没有配置API密钥，跳过验证
    if (!apiKey) {
      if (config.isDevelopment()) {
        console.log('🔓 Auth: API密钥未配置，跳过验证');
      }
      return { success: true };
    }

    // 从请求中提取API密钥
    const providedKey = this.extractApiKey(event);
    
    if (!providedKey) {
      console.warn('🚫 Auth: 缺少API密钥');
      return {
        success: false,
        error: 'API key required',
        statusCode: 401
      };
    }

    // 验证API密钥
    if (!this.validateApiKey(providedKey, apiKey)) {
      console.warn('🚫 Auth: API密钥无效');
      return {
        success: false,
        error: 'Invalid API key',
        statusCode: 401
      };
    }

    if (config.isDevelopment()) {
      console.log('✅ Auth: API密钥验证通过');
    }

    return { success: true };
  }

  // 从请求中提取API密钥
  private extractApiKey(event: HandlerEvent): string | undefined {
    // 1. 从请求头中获取 (推荐方式)
    const headerKey = event.headers['x-api-key'] || 
                     event.headers['X-API-Key'] || 
                     event.headers['authorization']?.replace('Bearer ', '');
    
    if (headerKey) {
      return headerKey.trim();
    }

    // 2. 从查询参数中获取 (备用方式)
    const queryKey = event.queryStringParameters?.api_key || 
                    event.queryStringParameters?.apikey ||
                    event.queryStringParameters?.key;
    
    if (queryKey) {
      return queryKey.trim();
    }

    return undefined;
  }

  // 验证API密钥
  private validateApiKey(providedKey: string, expectedKey: string): boolean {
    // 简单的字符串比较
    // 在生产环境中，你可能想要使用更安全的比较方法
    return this.secureCompare(providedKey, expectedKey);
  }

  // 安全的字符串比较（防止时间攻击）
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  // 生成API密钥建议
  public generateApiKeySuggestion(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // 记录认证事件
  public logAuthEvent(
    event: HandlerEvent, 
    result: 'SUCCESS' | 'FAILED' | 'SKIPPED',
    reason?: string
  ): void {
    if (!config.isDevelopment()) return;

    const clientIP = this.extractClientIP(event);
    const userAgent = event.headers['user-agent'];
    
    const logData = {
      timestamp: new Date().toISOString(),
      result,
      reason,
      clientIP: this.maskIP(clientIP),
      userAgent: userAgent?.substring(0, 50) + '...',
      method: event.httpMethod,
      hasApiKeyHeader: !!(event.headers['x-api-key'] || event.headers['X-API-Key']),
      hasApiKeyQuery: !!(event.queryStringParameters?.api_key)
    };

    switch (result) {
      case 'SUCCESS':
        console.log('✅ Auth Event:', logData);
        break;
      case 'FAILED':
        console.warn('❌ Auth Event:', logData);
        break;
      case 'SKIPPED':
        console.log('⏭️ Auth Event:', logData);
        break;
    }
  }

  // 提取客户端IP
  private extractClientIP(event: HandlerEvent): string {
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip'
    ];

    for (const header of ipHeaders) {
      const value = event.headers[header];
      if (value) {
        return value.split(',')[0].trim();
      }
    }

    return 'unknown';
  }

  // 遮掩IP地址（隐私保护）
  private maskIP(ip: string): string {
    if (ip === 'unknown') return ip;
    
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
      }
    }
    
    return ip;
  }

  // 检查是否需要API密钥
  public isApiKeyRequired(): boolean {
    return !!config.getApiSecretKey();
  }

  // 获取API密钥配置状态
  public getAuthStatus(): {
    enabled: boolean;
    keyConfigured: boolean;
    keyLength?: number;
  } {
    const apiKey = config.getApiSecretKey();
    
    return {
      enabled: !!apiKey,
      keyConfigured: !!apiKey,
      keyLength: apiKey?.length
    };
  }

  // 为开发者提供API密钥使用指南
  public getUsageInstructions(): {
    headerMethod: string;
    queryMethod: string;
    curlExample: string;
  } {
    return {
      headerMethod: 'X-API-Key: your-api-key-here',
      queryMethod: '?api_key=your-api-key-here',
      curlExample: `curl -H "X-API-Key: your-api-key-here" "https://your-site.netlify.app/.netlify/functions/getDownloadLinks?url=VIDEO_URL"`
    };
  }
}

// 单例实例
export const authMiddleware = new AuthMiddleware();