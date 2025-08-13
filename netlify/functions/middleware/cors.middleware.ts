import { HandlerEvent } from '@netlify/functions';
import { MiddlewareContext, MiddlewareResult } from '../types/api.types';
import { config } from '../utils/config';

class CorsMiddleware {
  
  // 验证CORS请求
  public async validate(event: HandlerEvent): Promise<MiddlewareResult> {
    const origin = event.headers.origin || event.headers.Origin;
    
    // 检查是否允许该源
    if (!this.isOriginAllowed(origin)) {
      console.warn(`🚫 CORS: 拒绝来自未授权域名的请求: ${origin}`);
      return {
        success: false,
        error: `Origin ${origin} not allowed`,
        statusCode: 403
      };
    }

    // 记录允许的请求
    if (config.isDevelopment()) {
      console.log(`✅ CORS: 允许来自 ${origin || 'null'} 的请求`);
    }

    return { success: true };
  }

  // 检查源是否被允许
  private isOriginAllowed(origin: string | undefined): boolean {
    // 获取配置的允许域名列表
    const allowedOrigins = config.getAllowedOrigins();
    
    // 如果没有origin头（某些情况下是正常的），允许请求
    if (!origin) {
      return true;
    }

    // 检查通配符
    if (allowedOrigins.includes('*')) {
      return true;
    }

    // 检查精确匹配
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // 开发环境的额外检查
    if (config.isDevelopment()) {
      // 自动允许localhost的各种端口
      const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localhostPattern.test(origin)) {
        return true;
      }

      // 允许Netlify预览URL
      if (origin.includes('deploy-preview') && origin.includes('netlify.app')) {
        return true;
      }
    }

    return false;
  }

  // 获取CORS头部
  public getCorsHeaders(origin?: string): Record<string, string> {
    const allowedOrigins = config.getAllowedOrigins();
    
    // 确定允许的源
    let allowOrigin = '*'; // 默认值（向后兼容）
    
    if (origin && this.isOriginAllowed(origin)) {
      allowOrigin = origin;
    } else if (!allowedOrigins.includes('*')) {
      // 如果没有通配符且origin不被允许，则设为null
      allowOrigin = 'null';
    }

    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'false',
      'Access-Control-Max-Age': '86400' // 24小时
    };
  }

  // 处理预检请求
  public handlePreflight(event: HandlerEvent): boolean {
    return event.httpMethod === 'OPTIONS';
  }

  // 记录CORS相关信息
  public logCorsInfo(event: HandlerEvent): void {
    if (!config.isDevelopment()) return;

    const origin = event.headers.origin || event.headers.Origin;
    const method = event.httpMethod;
    const userAgent = event.headers['user-agent'];
    const allowedOrigins = config.getAllowedOrigins();

    console.log('🌐 CORS Info:', {
      origin: origin || 'null',
      method,
      userAgent: userAgent?.substring(0, 50) + '...',
      allowedOrigins: allowedOrigins.length > 5 ? 
        [...allowedOrigins.slice(0, 5), `... +${allowedOrigins.length - 5} more`] : 
        allowedOrigins,
      isAllowed: this.isOriginAllowed(origin)
    });
  }

  // 构建上下文信息
  public createContext(event: HandlerEvent): MiddlewareContext {
    const clientIP = this.extractClientIP(event);
    
    return {
      event,
      context: {} as any, // 这里会在实际调用时填充
      clientIP,
      userAgent: event.headers['user-agent'],
      startTime: Date.now()
    };
  }

  // 提取客户端IP
  private extractClientIP(event: HandlerEvent): string {
    // 尝试多个可能的IP头部字段
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];

    for (const header of ipHeaders) {
      const value = event.headers[header];
      if (value) {
        // x-forwarded-for 可能包含多个IP，取第一个
        const ip = value.split(',')[0].trim();
        if (this.isValidIP(ip)) {
          return ip;
        }
      }
    }

    // 默认返回unknown
    return 'unknown';
  }

  // 验证IP格式
  private isValidIP(ip: string): boolean {
    // 简单的IP验证（IPv4和IPv6）
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

// 单例实例
export const corsMiddleware = new CorsMiddleware();