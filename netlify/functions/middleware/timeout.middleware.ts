import { config } from '../utils/config';

class TimeoutMiddleware {
  
  // 包装函数以添加超时控制
  public async withTimeout<T>(
    asyncFunction: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const timeout = timeoutMs || config.getFunctionTimeout();
    
    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, timeout);
      
      // 确保定时器不会阻止进程退出
      if (timer.unref) {
        timer.unref();
      }
    });

    try {
      // 竞争：原函数 vs 超时
      const result = await Promise.race([
        asyncFunction(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error: any) {
      // 如果是超时错误，添加更多上下文信息
      if (error.message === 'TIMEOUT') {
        const enhancedError = new Error(`Operation timed out after ${timeout}ms`);
        enhancedError.name = 'TimeoutError';
        (enhancedError as any).code = 'TIMEOUT';
        (enhancedError as any).timeout = timeout;
        throw enhancedError;
      }
      
      // 重新抛出其他错误
      throw error;
    }
  }

  // 包装多个异步操作的超时控制
  public async withTimeoutAll<T>(
    operations: Array<() => Promise<T>>,
    timeoutMs?: number
  ): Promise<T[]> {
    const timeout = timeoutMs || config.getFunctionTimeout();
    
    const wrappedOperations = operations.map(op => 
      this.withTimeout(op, timeout)
    );
    
    return Promise.all(wrappedOperations);
  }

  // 带重试的超时控制
  public async withTimeoutAndRetry<T>(
    asyncFunction: () => Promise<T>,
    maxRetries: number = 1,
    timeoutMs?: number,
    retryDelay: number = 1000
  ): Promise<T> {
    const timeout = timeoutMs || config.getFunctionTimeout();
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logTimeoutAttempt(attempt, maxRetries, timeout);
        
        const result = await this.withTimeout(asyncFunction, timeout);
        
        if (attempt > 0) {
          console.log(`✅ Timeout: 重试成功 (第${attempt + 1}次尝试)`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // 如果不是超时错误，或者已经是最后一次尝试，直接抛出
        if (error.message !== 'TIMEOUT' && error.code !== 'TIMEOUT') {
          throw error;
        }
        
        if (attempt === maxRetries) {
          break;
        }
        
        // 等待后重试
        console.warn(`⚠️ Timeout: 第${attempt + 1}次尝试超时，${retryDelay}ms后重试`);
        await this.delay(retryDelay);
      }
    }
    
    // 所有重试都失败了
    const finalError = new Error(`All ${maxRetries + 1} attempts timed out after ${timeout}ms each`);
    finalError.name = 'TimeoutError';
    (finalError as any).code = 'TIMEOUT';
    (finalError as any).attempts = maxRetries + 1;
    (finalError as any).timeout = timeout;
    (finalError as any).originalError = lastError;
    
    throw finalError;
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms);
      if (timer.unref) {
        timer.unref();
      }
    });
  }

  // 记录超时尝试
  private logTimeoutAttempt(attempt: number, maxRetries: number, timeout: number): void {
    if (config.isDevelopment()) {
      if (attempt === 0) {
        console.log(`⏱️ Timeout: 开始执行 (超时限制: ${timeout}ms)`);
      } else {
        console.log(`🔄 Timeout: 重试第${attempt}次 (剩余${maxRetries - attempt}次, 超时限制: ${timeout}ms)`);
      }
    }
  }

  // 创建可取消的超时Promise
  public createCancellableTimeout<T>(
    asyncFunction: () => Promise<T>,
    timeoutMs?: number
  ): {
    promise: Promise<T>;
    cancel: () => void;
    isTimedOut: () => boolean;
  } {
    const timeout = timeoutMs || config.getFunctionTimeout();
    let timeoutId: NodeJS.Timeout;
    let isTimedOut = false;
    let isCancelled = false;
    
    const promise = new Promise<T>((resolve, reject) => {
      // 设置超时
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          isTimedOut = true;
          reject(new Error('TIMEOUT'));
        }
      }, timeout);
      
      // 执行原函数
      asyncFunction()
        .then(result => {
          if (!isTimedOut && !isCancelled) {
            clearTimeout(timeoutId);
            resolve(result);
          }
        })
        .catch(error => {
          if (!isTimedOut && !isCancelled) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });
    });

    const cancel = () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };

    const getIsTimedOut = () => isTimedOut;

    return {
      promise,
      cancel,
      isTimedOut: getIsTimedOut
    };
  }

  // 获取超时配置信息
  public getTimeoutConfig(): {
    functionTimeout: number;
    frontendTimeout: number;
    recommendedBuffer: number;
  } {
    const functionTimeout = config.getFunctionTimeout();
    const frontendTimeout = config.getFrontendTimeout();
    
    return {
      functionTimeout,
      frontendTimeout,
      recommendedBuffer: frontendTimeout - functionTimeout
    };
  }

  // 验证超时配置
  public validateTimeoutConfig(): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const functionTimeout = config.getFunctionTimeout();
    const frontendTimeout = config.getFrontendTimeout();
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 检查前端超时是否大于后端超时
    if (frontendTimeout <= functionTimeout) {
      warnings.push(`前端超时(${frontendTimeout}ms) 应该大于后端超时(${functionTimeout}ms)`);
      recommendations.push(`建议设置前端超时为 ${functionTimeout + 5000}ms 以上`);
    }
    
    // 检查是否超过Netlify限制
    const netlifyLimit = 10000; // 10秒
    if (functionTimeout > netlifyLimit) {
      warnings.push(`后端超时(${functionTimeout}ms) 超过Netlify免费版限制(${netlifyLimit}ms)`);
      recommendations.push(`建议设置后端超时为 ${netlifyLimit}ms 或更少`);
    }
    
    // 检查是否太短
    if (functionTimeout < 5000) {
      warnings.push(`后端超时(${functionTimeout}ms) 可能太短，YouTube解析通常需要3-8秒`);
      recommendations.push(`建议设置后端超时为 8000ms 以上`);
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  // 记录超时统计
  public logTimeoutStats(
    operation: string,
    startTime: number,
    endTime: number,
    wasTimeout: boolean
  ): void {
    const duration = endTime - startTime;
    const timeout = config.getFunctionTimeout();
    const utilizationPercent = Math.round((duration / timeout) * 100);
    
    const logData = {
      operation,
      duration: `${duration}ms`,
      timeout: `${timeout}ms`,
      utilization: `${utilizationPercent}%`,
      status: wasTimeout ? 'TIMEOUT' : 'SUCCESS',
      timestamp: new Date().toISOString()
    };
    
    if (wasTimeout) {
      console.error('⏰ Timeout Stats:', logData);
    } else if (config.isDevelopment() || utilizationPercent > 80) {
      console.log('⏱️ Timeout Stats:', logData);
    }
  }
}

// 单例实例
export const timeoutMiddleware = new TimeoutMiddleware();