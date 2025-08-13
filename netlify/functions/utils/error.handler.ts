import { HandlerResponse } from '@netlify/functions';
import { ErrorType } from '../types/api.types';
import { responseBuilder } from './response.builder';

interface ErrorContext {
  timestamp: string;
  clientIP?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  requestId?: string;
}

class ErrorHandler {
  
  // 主要错误处理方法
  public handle(error: any, context?: ErrorContext, origin?: string): HandlerResponse {
    const errorInfo = this.analyzeError(error);
    
    // 记录详细错误日志
    this.logError(error, errorInfo, context);
    
    // 根据错误类型构建响应
    return this.buildErrorResponse(errorInfo, error, origin);
  }

  // 分析错误类型和特征
  private analyzeError(error: any): {
    type: ErrorType;
    isKnown: boolean;
    severity: 'low' | 'medium' | 'high';
    shouldRetry: boolean;
  } {
    const message = error.message || '';
    const statusCode = error.statusCode || error.status;

    // 超时错误
    if (message.includes('TIMEOUT') || message.includes('timeout')) {
      return {
        type: ErrorType.TIMEOUT,
        isKnown: true,
        severity: 'medium',
        shouldRetry: true
      };
    }

    // 403 Forbidden
    if (message.includes('403') || statusCode === 403) {
      return {
        type: ErrorType.FORBIDDEN,
        isKnown: true,
        severity: 'medium',
        shouldRetry: false
      };
    }

    // 视频不可用
    if (message.includes('unavailable') || message.includes('private') || message.includes('deleted')) {
      return {
        type: ErrorType.VIDEO_UNAVAILABLE,
        isKnown: true,
        severity: 'low',
        shouldRetry: false
      };
    }

    // 年龄限制
    if (message.includes('age') && message.includes('restricted')) {
      return {
        type: ErrorType.AGE_RESTRICTED,
        isKnown: true,
        severity: 'low',
        shouldRetry: false
      };
    }

    // 限流错误
    if (message.includes('RATE_LIMIT') || statusCode === 429) {
      return {
        type: ErrorType.RATE_LIMIT_EXCEEDED,
        isKnown: true,
        severity: 'low',
        shouldRetry: true
      };
    }

    // 认证错误
    if (message.includes('UNAUTHORIZED') || statusCode === 401) {
      return {
        type: ErrorType.UNAUTHORIZED,
        isKnown: true,
        severity: 'medium',
        shouldRetry: false
      };
    }

    // 无效URL
    if (message.includes('Invalid URL') || message.includes('invalid') && message.includes('url')) {
      return {
        type: ErrorType.INVALID_URL,
        isKnown: true,
        severity: 'low',
        shouldRetry: false
      };
    }

    // 网络相关错误
    if (message.includes('ECONNRESET') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      return {
        type: ErrorType.TIMEOUT,
        isKnown: true,
        severity: 'medium',
        shouldRetry: true
      };
    }

    // 未知错误
    return {
      type: ErrorType.UNKNOWN,
      isKnown: false,
      severity: 'high',
      shouldRetry: false
    };
  }

  // 构建错误响应
  private buildErrorResponse(
    errorInfo: ReturnType<typeof this.analyzeError>,
    originalError: any,
    origin?: string
  ): HandlerResponse {
    const message = originalError.message || 'An unexpected error occurred';

    switch (errorInfo.type) {
      case ErrorType.TIMEOUT:
        return responseBuilder.timeout(origin);
      
      case ErrorType.FORBIDDEN:
        return responseBuilder.forbidden(message, origin);
      
      case ErrorType.VIDEO_UNAVAILABLE:
        return responseBuilder.videoUnavailable(message, origin);
      
      case ErrorType.AGE_RESTRICTED:
        return responseBuilder.ageRestricted(message, origin);
      
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return responseBuilder.rateLimitExceeded(60, origin);
      
      case ErrorType.UNAUTHORIZED:
        return responseBuilder.unauthorized(origin);
      
      case ErrorType.INVALID_URL:
        return responseBuilder.invalidUrl(origin);
      
      default:
        return responseBuilder.genericError(originalError, origin);
    }
  }

  // 记录错误日志
  private logError(
    error: any,
    errorInfo: ReturnType<typeof this.analyzeError>,
    context?: ErrorContext
  ): void {
    const timestamp = new Date().toISOString();
    const logLevel = this.getLogLevel(errorInfo.severity);
    
    const logData = {
      timestamp,
      level: logLevel,
      error: {
        type: errorInfo.type,
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || error.status,
        isKnown: errorInfo.isKnown,
        severity: errorInfo.severity,
        shouldRetry: errorInfo.shouldRetry
      },
      context: context || {},
      environment: {
        nodeEnv: process.env.NODE_ENV,
        netlifyDev: process.env.NETLIFY_DEV,
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'getDownloadLinks'
      }
    };

    // 根据严重性选择日志方法
    switch (errorInfo.severity) {
      case 'high':
        console.error('🚨 HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case 'low':
        console.log('ℹ️ LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
    }

    // 开发环境额外打印错误堆栈
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('📋 Error Stack Trace:', error.stack);
    }
  }

  // 获取日志级别
  private getLogLevel(severity: string): string {
    switch (severity) {
      case 'high': return 'ERROR';
      case 'medium': return 'WARN';
      case 'low': return 'INFO';
      default: return 'ERROR';
    }
  }

  // 创建错误上下文
  public createContext(
    clientIP?: string,
    userAgent?: string,
    url?: string,
    method?: string,
    requestId?: string
  ): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      clientIP,
      userAgent,
      url,
      method,
      requestId: requestId || this.generateRequestId()
    };
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取用户友好的错误建议
  public getErrorSuggestions(errorType: ErrorType): string[] {
    switch (errorType) {
      case ErrorType.TIMEOUT:
        return [
          '请检查网络连接',
          '稍后重试',
          '视频可能较大，请等待更长时间'
        ];
      
      case ErrorType.FORBIDDEN:
        return [
          '视频可能有地区限制',
          '检查视频是否需要登录访问',
          '尝试使用其他网络环境'
        ];
      
      case ErrorType.VIDEO_UNAVAILABLE:
        return [
          '检查视频链接是否正确',
          '视频可能已被删除或设为私有',
          '尝试使用公开的视频链接'
        ];
      
      case ErrorType.AGE_RESTRICTED:
        return [
          '视频有年龄限制',
          '尝试使用其他视频'
        ];
      
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return [
          '请求过于频繁',
          '请等待1分钟后重试',
          '避免短时间内多次请求'
        ];
      
      case ErrorType.INVALID_URL:
        return [
          '请提供有效的YouTube视频链接',
          '确保链接格式正确',
          '支持格式：https://www.youtube.com/watch?v=VIDEO_ID'
        ];
      
      default:
        return [
          '请检查输入并重试',
          '如果问题持续，请联系技术支持'
        ];
    }
  }
}

// 单例实例
export const errorHandler = new ErrorHandler();