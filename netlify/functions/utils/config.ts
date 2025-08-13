import { Config } from '../types/api.types';

class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    return {
      // CORS配置：允许的域名列表
      allowedOrigins: this.parseAllowedOrigins(),
      
      // API密钥（可选）
      apiSecretKey: process.env.API_SECRET_KEY,
      
      // 限流配置
      enableRateLimit: this.parseBoolean(process.env.ENABLE_RATE_LIMIT, true),
      rateLimitPerMinute: this.parseNumber(process.env.RATE_LIMIT_PER_MINUTE, 6),
      
      // 超时配置
      functionTimeout: this.parseNumber(process.env.FUNCTION_TIMEOUT, 10000), // 10秒
      frontendTimeout: this.parseNumber(process.env.FRONTEND_TIMEOUT, 15000), // 15秒
    };
  }

  private parseAllowedOrigins(): string[] {
    const originsEnv = process.env.ALLOWED_ORIGINS;
    
    if (!originsEnv) {
      // 默认配置：开发环境允许localhost，生产环境允许所有
      const isDev = process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';
      
      if (isDev) {
        return [
          'http://localhost:7777',
          'http://localhost:3000',
          'http://127.0.0.1:7777',
          'http://127.0.0.1:3000'
        ];
      } else {
        // 生产环境未配置时使用通配符（向后兼容）
        return ['*'];
      }
    }

    // 解析逗号分隔的域名列表
    return originsEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // 获取配置
  public getConfig(): Config {
    return { ...this.config };
  }

  // 获取CORS允许的域名
  public getAllowedOrigins(): string[] {
    return [...this.config.allowedOrigins];
  }

  // 检查域名是否被允许
  public isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return false;
    
    const allowedOrigins = this.config.allowedOrigins;
    
    // 检查通配符
    if (allowedOrigins.includes('*')) return true;
    
    // 检查精确匹配
    return allowedOrigins.includes(origin);
  }

  // 获取API密钥
  public getApiSecretKey(): string | undefined {
    return this.config.apiSecretKey;
  }

  // 检查是否启用限流
  public isRateLimitEnabled(): boolean {
    return this.config.enableRateLimit;
  }

  // 获取限流设置
  public getRateLimitPerMinute(): number {
    return this.config.rateLimitPerMinute;
  }

  // 获取超时设置
  public getFunctionTimeout(): number {
    return this.config.functionTimeout;
  }

  public getFrontendTimeout(): number {
    return this.config.frontendTimeout;
  }

  // 开发环境检查
  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';
  }
}

// 单例实例
export const config = new ConfigManager();