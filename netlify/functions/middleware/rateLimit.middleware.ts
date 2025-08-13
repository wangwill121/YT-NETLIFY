import { HandlerEvent } from '@netlify/functions';
import { MiddlewareResult, RateLimitRecord } from '../types/api.types';
import { config } from '../utils/config';

class RateLimitMiddleware {
  // 内存存储IP访问记录（函数重启会清空）
  private accessMap = new Map<string, RateLimitRecord>();
  
  // 清理过期记录的间隔
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // 启动清理定时器（每5分钟清理一次过期记录）
    this.startCleanupTimer();
  }

  // 检查IP是否超过限流
  public async validate(event: HandlerEvent): Promise<MiddlewareResult> {
    // 如果限流功能被禁用，直接通过
    if (!config.isRateLimitEnabled()) {
      return { success: true };
    }

    const clientIP = this.extractClientIP(event);
    const now = Date.now();
    const rateLimitPerMinute = config.getRateLimitPerMinute();

    // 获取或创建IP记录
    const record = this.getOrCreateRecord(clientIP, now);

    // 检查是否超过时间窗口，需要重置
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + 60000; // 1分钟后重置
      record.firstRequest = now;
      this.accessMap.set(clientIP, record);
      
      this.logRateLimit(clientIP, record, 'RESET');
      return { success: true };
    }

    // 检查是否超过限制
    if (record.count >= rateLimitPerMinute) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      this.logRateLimit(clientIP, record, 'BLOCKED', retryAfter);
      
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        statusCode: 429
      };
    }

    // 增加计数并允许请求
    record.count++;
    this.accessMap.set(clientIP, record);
    
    this.logRateLimit(clientIP, record, 'ALLOWED');
    
    return { success: true };
  }

  // 获取或创建IP记录
  private getOrCreateRecord(ip: string, now: number): RateLimitRecord {
    const existing = this.accessMap.get(ip);
    
    if (existing) {
      return existing;
    }

    // 创建新记录
    const newRecord: RateLimitRecord = {
      count: 0,
      resetTime: now + 60000, // 1分钟后重置
      firstRequest: now
    };

    this.accessMap.set(ip, newRecord);
    return newRecord;
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

    // 如果无法获取IP，使用一个默认值（这样至少不会完全破坏功能）
    return 'unknown';
  }

  // 验证IP格式
  private isValidIP(ip: string): boolean {
    // 简单的IP验证（IPv4和IPv6）
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // 记录限流日志
  private logRateLimit(
    ip: string, 
    record: RateLimitRecord, 
    action: 'ALLOWED' | 'BLOCKED' | 'RESET',
    retryAfter?: number
  ): void {
    const rateLimitPerMinute = config.getRateLimitPerMinute();
    const remaining = Math.max(0, rateLimitPerMinute - record.count);
    
    const logData = {
      timestamp: new Date().toISOString(),
      ip: this.maskIP(ip), // 出于隐私考虑，遮掩部分IP
      action,
      current: record.count,
      limit: rateLimitPerMinute,
      remaining,
      resetTime: new Date(record.resetTime).toISOString(),
      retryAfter
    };

    switch (action) {
      case 'BLOCKED':
        console.warn('🚫 Rate Limit BLOCKED:', logData);
        break;
      case 'RESET':
        console.log('🔄 Rate Limit RESET:', logData);
        break;
      case 'ALLOWED':
        if (config.isDevelopment() || record.count % 3 === 0) {
          // 开发环境或每3次请求记录一次
          console.log('✅ Rate Limit ALLOWED:', logData);
        }
        break;
    }
  }

  // 遮掩IP地址（隐私保护）
  private maskIP(ip: string): string {
    if (ip === 'unknown') return ip;
    
    // IPv4: 192.168.1.1 -> 192.168.*.1
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
      }
    }
    
    // IPv6: 简单遮掩中间部分
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length > 4) {
        return `${parts[0]}:${parts[1]}:***:${parts[parts.length-1]}`;
      }
    }
    
    return ip;
  }

  // 获取当前限流状态
  public getRateLimitStatus(ip: string): {
    remaining: number;
    resetTime: number;
    total: number;
  } {
    const rateLimitPerMinute = config.getRateLimitPerMinute();
    const record = this.accessMap.get(ip);
    
    if (!record) {
      return {
        remaining: rateLimitPerMinute,
        resetTime: Date.now() + 60000,
        total: rateLimitPerMinute
      };
    }

    return {
      remaining: Math.max(0, rateLimitPerMinute - record.count),
      resetTime: record.resetTime,
      total: rateLimitPerMinute
    };
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    // 避免重复启动
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRecords();
    }, 5 * 60 * 1000); // 5分钟清理一次

    // 在函数环境中，确保定时器不会阻止进程退出
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  // 清理过期记录
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [ip, record] of this.accessMap.entries()) {
      // 清理超过5分钟没有活动的记录
      if (now > record.resetTime + 5 * 60 * 1000) {
        this.accessMap.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0 && config.isDevelopment()) {
      console.log(`🧹 Rate Limit: 清理了 ${cleanedCount} 个过期记录，当前活跃IP: ${this.accessMap.size}`);
    }
  }

  // 获取统计信息
  public getStats(): {
    activeIPs: number;
    totalRecords: number;
    enabledStatus: boolean;
    rateLimit: number;
  } {
    return {
      activeIPs: this.accessMap.size,
      totalRecords: this.accessMap.size,
      enabledStatus: config.isRateLimitEnabled(),
      rateLimit: config.getRateLimitPerMinute()
    };
  }

  // 手动清理（主要用于测试）
  public clearAll(): void {
    this.accessMap.clear();
    console.log('🧹 Rate Limit: 手动清理所有记录');
  }

  // 停止清理定时器（主要用于测试）
  public stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// 单例实例
export const rateLimitMiddleware = new RateLimitMiddleware();