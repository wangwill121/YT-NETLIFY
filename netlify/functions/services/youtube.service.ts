import { VideoInfo, VideoFormat, AudioFormat, VideoStats, UrlQualityScore } from '../types/api.types';
import { formatService } from './format.service';

class YouTubeService {
  
  // 主要方法：获取视频信息
  public async getVideoInfo(videoUrl: string): Promise<VideoInfo> {
    const startTime = Date.now();
    console.log('🎯 Processing video URL:', videoUrl);
    console.log('⏰ Start time:', new Date().toISOString());

    // ✨ @distube/ytdl-core 自动处理所有复杂逻辑：
    // - poToken自动生成 (无需手动配置)
    // - n参数自动生成 (无需JavaScript执行)
    // - 实验标识自动更新 (无需手动维护)
    // - 403错误自动规避 (内置优化)
    
    console.log('🚀 Loading @distube/ytdl-core for optimized YouTube access...');
    
    // 动态导入@distube/ytdl-core (CommonJS模块)
    const ytdl = await import('@distube/ytdl-core').then(module => module.default);
    
    console.log('✨ @distube/ytdl-core loaded, fetching video info...');
    const info = await ytdl.getInfo(videoUrl);  // 移除了不存在的quality选项

    const videoDetails = info.videoDetails;
    console.log('✅ Successfully retrieved video info:', videoDetails.title);
    
    // 🔍 调试：检查生成的URL质量
    this.checkUrlQuality(info.formats);

    // 获取所有可用格式
    const formats = info.formats;

    // 分离音频和视频格式
    const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);
    const videoFormats = formats.filter(f => f.hasVideo && !f.hasAudio);
    const combinedFormats = formats.filter(f => f.hasAudio && f.hasVideo);

    this.logFormatStats(formats, audioFormats, videoFormats, combinedFormats);

    // 使用格式服务处理格式
    const processedFormats = formatService.processFormats(
      audioFormats, 
      videoFormats, 
      combinedFormats
    );

    // 获取最佳缩略图
    const bestThumbnail = this.getBestThumbnail(videoDetails.thumbnails);

    // 构建统计信息
    const stats = this.buildStats(
      formats, 
      processedFormats.videos, 
      processedFormats.audios,
      info.formats
    );

    const endTime = Date.now();
    console.log(`⏱️ Total processing time: ${endTime - startTime}ms`);

    return {
      title: videoDetails.title,
      thumbnail: bestThumbnail?.url || '',
      duration: parseInt(videoDetails.lengthSeconds?.toString() || '0'),
      audios: processedFormats.audios,
      videos: processedFormats.videos,
      viewCount: parseInt(videoDetails.viewCount?.toString() || '0'),
      uploadDate: videoDetails.uploadDate || '',
      author: videoDetails.author?.name || 'Unknown',
      stats
    };
  }

  // 检查URL质量
  private checkUrlQuality(formats: any[]): void {
    if (formats && formats.length > 0) {
      const sampleUrl = formats[0].url;
      const urlObj = new URL(sampleUrl);
      
      const nParam = urlObj.searchParams.get('n');
      const potParam = urlObj.searchParams.get('pot');
      const sigParam = urlObj.searchParams.get('sig');
      
      console.log('🔍 URL Quality Check:');
      console.log(`- n parameter: ${nParam ? '✅' : '❌'} (${nParam?.length || 0} chars)`);
      console.log(`- pot parameter: ${potParam ? '✅' : '❌'} (${potParam?.length || 0} chars)`);
      console.log(`- sig parameter: ${sigParam ? '✅' : '❌'} (${sigParam?.length || 0} chars)`);
      
      // 与downr.org标准对比
      const qualityScore = {
        n: nParam && nParam.length > 10 ? 1 : 0,
        pot: potParam && potParam.length > 200 ? 1 : 0,
        sig: sigParam && sigParam.length > 50 ? 1 : 0
      };
      const totalScore = Object.values(qualityScore).reduce((a, b) => a + b, 0);
      console.log(`📊 Quality Score: ${totalScore}/3 (downr.org standard: 3/3)`);
    }
  }

  // 记录格式统计
  private logFormatStats(
    formats: any[], 
    audioFormats: any[], 
    videoFormats: any[], 
    combinedFormats: any[]
  ): void {
    console.log(`📊 格式分类统计:`);
    console.log(`- 总格式数: ${formats.length}`);
    console.log(`- 纯音频格式: ${audioFormats.length}`);
    console.log(`- 纯视频格式: ${videoFormats.length}`);
    console.log(`- 混合格式: ${combinedFormats.length}`);

    // 打印前几个格式的详细信息用于调试
    console.log(`🔍 前5个格式详情:`);
    formats.slice(0, 5).forEach((format, i) => {
      console.log(`  ${i+1}. itag:${format.itag} container:${format.container} hasAudio:${format.hasAudio} hasVideo:${format.hasVideo} mimeType:${format.mimeType}`);
    });
  }

  // 获取最佳缩略图
  private getBestThumbnail(thumbnails: any[]): any {
    return thumbnails && thumbnails.length > 0 
      ? thumbnails[thumbnails.length - 1] 
      : null;
  }

  // 构建统计信息
  private buildStats(
    originalFormats: any[], 
    processedVideos: VideoFormat[], 
    processedAudios: AudioFormat[],
    allFormats: any[]
  ): VideoStats {
    const urlQualityScore = this.calculateUrlQualityScore(allFormats);
    
    return {
      totalFormatsOriginal: originalFormats.length,
      returnedFormats: processedVideos.length + processedAudios.length,
      audioFormats: processedAudios.length,
      videoFormats: processedVideos.length,
      optimizationRate: `${Math.round((1 - (processedVideos.length + processedAudios.length) / originalFormats.length) * 100)}%`,
      highestQuality: processedVideos[0]?.qualityLabel || 'N/A',
      library: '@distube/ytdl-core v4.16.12',
      optimized: true,
      version: '格式优化版本 v1.0',
      urlQualityScore
    };
  }

  // 计算URL质量评分
  private calculateUrlQualityScore(formats: any[]): UrlQualityScore {
    if (!formats || formats.length === 0) {
      return { n: 0, pot: 0, sig: 0, total: 0 };
    }

    const sampleUrl = formats[0].url;
    const urlObj = new URL(sampleUrl);
    const nParam = urlObj.searchParams.get('n');
    const potParam = urlObj.searchParams.get('pot');
    const sigParam = urlObj.searchParams.get('sig');
    
    const scores = {
      n: nParam && nParam.length > 10 ? 1 : 0,
      pot: potParam && potParam.length > 200 ? 1 : 0,
      sig: sigParam && sigParam.length > 50 ? 1 : 0
    };
    
    return {
      ...scores,
      total: scores.n + scores.pot + scores.sig
    };
  }

  // 验证视频URL
  public validateVideoUrl(url: string): boolean {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      
      // 支持的YouTube域名
      const validDomains = [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtu.be'
      ];
      
      return validDomains.some(domain => urlObj.hostname === domain);
    } catch {
      return false;
    }
  }

  // 提取视频ID
  public extractVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      }
      
      // youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // 获取服务信息
  public getServiceInfo(): {
    name: string;
    version: string;
    library: string;
    features: string[];
  } {
    return {
      name: 'YouTube Download Service',
      version: '2.0.0',
      library: '@distube/ytdl-core v4.16.12',
      features: [
        'Format optimization',
        'Quality filtering',
        'Error handling',
        'URL validation',
        'Statistics tracking'
      ]
    };
  }
}

// 单例实例
export const youtubeService = new YouTubeService();