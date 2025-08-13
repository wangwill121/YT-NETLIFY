import { HandlerEvent, HandlerContext } from '@netlify/functions';

// 视频格式接口
export interface VideoFormat {
  itag: number;
  url: string;
  mimeType: string;
  container: string;
  codecs?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
  qualityLabel: string;
  contentLength?: string;
  hasUrl: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
}

// 音频格式接口
export interface AudioFormat {
  itag: number;
  url: string;
  mimeType: string;
  container: string;
  codecs?: string;
  bitrate?: number;
  audioSampleRate?: string;
  audioChannels?: number;
  contentLength?: string;
  hasUrl: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  qualityLabel: string;
}

// 视频信息接口
export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  audios: AudioFormat[];
  videos: VideoFormat[];
  viewCount: number;
  uploadDate: string;
  author: string;
  stats: VideoStats;
}

// 统计信息接口
export interface VideoStats {
  totalFormatsOriginal: number;
  returnedFormats: number;
  audioFormats: number;
  videoFormats: number;
  optimizationRate: string;
  highestQuality: string;
  library: string;
  optimized: boolean;
  version: string;
  urlQualityScore: UrlQualityScore;
}

// URL质量评分接口
export interface UrlQualityScore {
  n: number;
  pot: number;
  sig: number;
  total: number;
}

// API响应接口
export interface APIResponse<T = any> {
  status: 'SUCCESS' | 'ERROR';
  data?: T;
  message?: string;
  errorCode?: string;
  details?: string;
  retryAfter?: number;
  timestamp?: string;
}

// 错误类型枚举
export enum ErrorType {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  FORBIDDEN = '403_FORBIDDEN',
  INVALID_URL = 'INVALID_URL',
  AGE_RESTRICTED = 'AGE_RESTRICTED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN = 'UNKNOWN'
}

// 中间件上下文接口
export interface MiddlewareContext {
  event: HandlerEvent;
  context: HandlerContext;
  clientIP: string;
  userAgent?: string;
  startTime: number;
}

// 限流记录接口
export interface RateLimitRecord {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// 配置接口
export interface Config {
  allowedOrigins: string[];
  apiSecretKey?: string;
  enableRateLimit: boolean;
  rateLimitPerMinute: number;
  functionTimeout: number;
  frontendTimeout: number;
}

// 中间件返回类型
export interface MiddlewareResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}