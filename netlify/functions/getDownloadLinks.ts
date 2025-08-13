import { Handler } from '@netlify/functions';
import { corsMiddleware } from './middleware/cors.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { timeoutMiddleware } from './middleware/timeout.middleware';
import { youtubeService } from './services/youtube.service';
import { responseBuilder } from './utils/response.builder';
import { errorHandler } from './utils/error.handler';

export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  const origin = event.headers.origin || event.headers.Origin;
  
  try {
    // 处理OPTIONS预检请求
    if (corsMiddleware.handlePreflight(event)) {
      return responseBuilder.options(origin);
    }

    // 检查请求方法和参数
    if (event.httpMethod !== 'GET' || !event.queryStringParameters || !event.queryStringParameters.url) {
      return responseBuilder.methodNotAllowed(origin);
    }

    // 中间件链式验证
    console.log('🔐 Starting middleware chain validation...');
    
    // 1. CORS验证
    corsMiddleware.logCorsInfo(event);
    const corsResult = await corsMiddleware.validate(event);
    if (!corsResult.success) {
      return responseBuilder.error('FORBIDDEN', corsResult.error || 'CORS validation failed', corsResult.statusCode || 403, undefined, undefined, origin);
    }

    // 2. 限流验证
    const rateLimitResult = await rateLimitMiddleware.validate(event);
    if (!rateLimitResult.success) {
      return responseBuilder.rateLimitExceeded(60, origin);
    }

    // 3. API密钥验证（如果配置）
    const authResult = await authMiddleware.validate(event);
    if (!authResult.success) {
      return responseBuilder.unauthorized(origin);
    }

    console.log('✅ All middleware validations passed');

    // 获取视频URL
    const videoUrl = event.queryStringParameters.url;
    
    // 4. 带超时的核心业务逻辑
    console.log('🎯 Starting YouTube video processing with timeout...');
    const videoInfo = await timeoutMiddleware.withTimeout(
      () => youtubeService.getVideoInfo(videoUrl)
    );

    console.log('✅ Video processing completed successfully');
    console.log(`⏱️ Total request time: ${Date.now() - startTime}ms`);

    // 构建成功响应
    return responseBuilder.success(videoInfo, origin);
    
  } catch (error: any) {
    console.error('💥 Request failed:', error);
    
    // 创建错误上下文
    const errorContext = errorHandler.createContext(
      corsMiddleware.createContext(event).clientIP,
      event.headers['user-agent'],
      event.queryStringParameters?.url,
      event.httpMethod
    );
    
    // 记录超时统计
    timeoutMiddleware.logTimeoutStats(
      'getDownloadLinks',
      startTime,
      Date.now(),
      error.message === 'TIMEOUT' || error.code === 'TIMEOUT'
    );
    
    // 统一错误处理
    return errorHandler.handle(error, errorContext, origin);
  }
};