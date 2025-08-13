import { HandlerResponse } from '@netlify/functions';
import { APIResponse, VideoInfo, ErrorType } from '../types/api.types';
import { config } from './config';

class ResponseBuilder {
  
  // 构建成功响应
  public success(data: VideoInfo, origin?: string): HandlerResponse {
    const response: APIResponse<VideoInfo> = {
      status: 'SUCCESS',
      data
    };

    return {
      statusCode: 200,
      headers: this.buildHeaders(origin),
      body: JSON.stringify(response)
    };
  }

  // 构建错误响应
  public error(
    errorType: ErrorType,
    message: string,
    statusCode: number = 400,
    details?: string,
    retryAfter?: number,
    origin?: string
  ): HandlerResponse {
    const response: APIResponse = {
      status: 'ERROR',
      message,
      errorCode: errorType,
      details,
      retryAfter,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode,
      headers: this.buildHeaders(origin),
      body: JSON.stringify(response)
    };
  }

  // 构建限流响应
  public rateLimitExceeded(retryAfter: number = 60, origin?: string): HandlerResponse {
    return this.error(
      ErrorType.RATE_LIMIT_EXCEEDED,
      '请求过于频繁，请稍后重试',
      429,
      `每分钟最多允许${config.getRateLimitPerMinute()}次请求`,
      retryAfter,
      origin
    );
  }

  // 构建方法不允许响应
  public methodNotAllowed(origin?: string): HandlerResponse {
    const response: APIResponse = {
      status: 'ERROR',
      message: 'Method Not Allowed or Missing URL parameter'
    };

    return {
      statusCode: 405,
      headers: {
        ...this.buildHeaders(origin),
        'Allow': 'GET'
      },
      body: JSON.stringify(response)
    };
  }

  // 构建超时响应
  public timeout(origin?: string): HandlerResponse {
    return this.error(
      ErrorType.TIMEOUT,
      '视频解析超时，请重试',
      408,
      '视频解析时间超过10秒限制，可能是网络问题或视频较大',
      undefined,
      origin
    );
  }

  // 构建未授权响应
  public unauthorized(origin?: string): HandlerResponse {
    return this.error(
      ErrorType.UNAUTHORIZED,
      'API密钥无效或缺失',
      401,
      '请在请求头X-API-Key或查询参数api_key中提供有效的API密钥',
      undefined,
      origin
    );
  }

  // 构建视频不可用响应
  public videoUnavailable(message: string, origin?: string): HandlerResponse {
    return this.error(
      ErrorType.VIDEO_UNAVAILABLE,
      message,
      400,
      '视频可能是私有的、已删除或不可用',
      undefined,
      origin
    );
  }

  // 构建403禁止响应
  public forbidden(message: string, origin?: string): HandlerResponse {
    return this.error(
      ErrorType.FORBIDDEN,
      message,
      403,
      '视频可能有地区限制或需要登录',
      undefined,
      origin
    );
  }

  // 构建年龄限制响应
  public ageRestricted(message: string, origin?: string): HandlerResponse {
    return this.error(
      ErrorType.AGE_RESTRICTED,
      message,
      400,
      '视频有年龄限制',
      undefined,
      origin
    );
  }

  // 构建无效URL响应
  public invalidUrl(origin?: string): HandlerResponse {
    return this.error(
      ErrorType.INVALID_URL,
      '无效的YouTube视频链接',
      400,
      '请提供有效的YouTube视频URL',
      undefined,
      origin
    );
  }

  // 构建通用错误响应（向后兼容）
  public genericError(error: any, origin?: string): HandlerResponse {
    console.error('💥 API Error:', error);
    
    // 分析错误类型（保持向后兼容）
    const message = error.message || 'Failed to fetch video information';
    const is403 = message?.includes('403') || error.statusCode === 403;
    const isUnavailable = message?.includes('unavailable') || message?.includes('private');
    const isAgeRestricted = message?.includes('age');
    const isTimeout = message?.includes('TIMEOUT') || message?.includes('timeout');

    if (isTimeout) {
      return this.timeout(origin);
    } else if (is403) {
      return this.forbidden(message, origin);
    } else if (isUnavailable) {
      return this.videoUnavailable(message, origin);
    } else if (isAgeRestricted) {
      return this.ageRestricted(message, origin);
    } else {
      return this.error(ErrorType.UNKNOWN, message, 400, undefined, undefined, origin);
    }
  }

  // 构建CORS头部
  private buildHeaders(origin?: string): Record<string, string> {
    const allowedOrigins = config.getAllowedOrigins();
    
    // 确定允许的源
    let allowOrigin = '*'; // 默认值（向后兼容）
    
    if (origin && config.isOriginAllowed(origin)) {
      allowOrigin = origin;
    } else if (!allowedOrigins.includes('*')) {
      // 如果没有通配符且提供了origin但不被允许，则拒绝
      allowOrigin = 'null';
    }

    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  // 构建OPTIONS响应（预检请求）
  public options(origin?: string): HandlerResponse {
    return {
      statusCode: 200,
      headers: this.buildHeaders(origin),
      body: ''
    };
  }
}

// 单例实例
export const responseBuilder = new ResponseBuilder();