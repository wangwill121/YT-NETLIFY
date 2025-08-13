import { VideoFormat, AudioFormat } from '../types/api.types';

class FormatService {
  
  // ITAG到质量映射
  private readonly itagQualityMap: Record<number, string> = {
    313: '2160p', 401: '2160p', // 4K
    271: '1440p', 400: '1440p', // 1440p
    137: '1080p', 248: '1080p', 399: '1080p', // 1080p
    136: '720p', 247: '720p', 398: '720p', // 720p
    135: '480p', 134: '360p', 133: '240p', 160: '144p'
  };

  // 主要方法：处理所有格式
  public processFormats(
    audioFormats: any[], 
    videoFormats: any[], 
    combinedFormats: any[]
  ): {
    audios: AudioFormat[];
    videos: VideoFormat[];
  } {
    // 转换音频格式
    const audios = this.convertAudioFormats(audioFormats);
    
    // 转换视频格式
    const videos = this.convertVideoFormats(videoFormats, combinedFormats);
    
    // 排序
    const sortedVideos = this.sortVideosByQuality(videos);
    const sortedAudios = this.sortAudiosByBitrate(audios);
    
    // 优化过滤
    const { targetVideos, targetAudios } = this.filterTargetFormats(sortedVideos, sortedAudios);
    
    // 过滤有效格式
    const validTargetVideos = targetVideos.filter(video => video.hasUrl);
    const validTargetAudios = targetAudios.filter(audio => audio.hasUrl);
    
    this.logOptimizationResults(
      audioFormats.length + videoFormats.length + combinedFormats.length,
      validTargetVideos.length + validTargetAudios.length,
      validTargetVideos,
      validTargetAudios
    );
    
    return {
      audios: validTargetAudios,
      videos: validTargetVideos
    };
  }

  // 转换音频格式 - 完全按照原文件逻辑
  private convertAudioFormats(audioFormats: any[]): AudioFormat[] {
    return audioFormats.map(format => ({
      itag: format.itag,
      url: format.url,
      mimeType: format.mimeType,
      container: format.container,
      codecs: format.codecs,
      bitrate: format.bitrate || format.audioBitrate,
      audioSampleRate: format.audioSampleRate,
      audioChannels: format.audioChannels,
      contentLength: format.contentLength,
      hasUrl: !!format.url,
      hasAudio: true,
      hasVideo: false,
      qualityLabel: 'audio-only',
    }));
  }

  // 转换视频格式 - 完全按照原文件逻辑
  private convertVideoFormats(videoFormats: any[], combinedFormats: any[]): VideoFormat[] {
    // 处理视频格式（仅视频，无音频）
    const videos = videoFormats.map(format => ({
      itag: format.itag,
      url: format.url,
      mimeType: format.mimeType,
      container: format.container,
      codecs: format.codecs,
      bitrate: format.bitrate,
      width: format.width,
      height: format.height,
      fps: format.fps,
      qualityLabel: this.getQualityLabel(format),
      contentLength: format.contentLength,
      hasUrl: !!format.url,
      hasAudio: false,
      hasVideo: true,
    }));

    // 处理组合格式（音频+视频）
    const combinedVideos = combinedFormats.map(format => ({
      itag: format.itag,
      url: format.url,
      mimeType: format.mimeType,
      container: format.container,
      codecs: format.codecs,
      bitrate: format.bitrate,
      width: format.width,
      height: format.height,
      fps: format.fps,
      qualityLabel: this.getQualityLabel(format),
      contentLength: format.contentLength,
      hasUrl: !!format.url,
      hasAudio: true,
      hasVideo: true,
    }));

    // 合并所有视频格式，优先显示组合格式
    return [...combinedVideos, ...videos];
  }

  // 提取质量标签
  private getQualityLabel(format: any): string {
    if (format.qualityLabel) return format.qualityLabel;
    if (format.height) return `${format.height}p`;
    return this.itagQualityMap[format.itag] || 'unknown';
  }

  // 按质量排序视频 - 完全按照原文件逻辑
  private sortVideosByQuality(videos: VideoFormat[]): VideoFormat[] {
    const sortByQuality = (formats: VideoFormat[]) => {
      return formats.sort((a, b) => {
        const getQualityValue = (format: VideoFormat) => {
          const match = format.qualityLabel?.match(/(\d+)p/);
          return match ? parseInt(match[1]) : format.height || 0;
        };
        return getQualityValue(b) - getQualityValue(a);
      });
    };
    
    return sortByQuality(videos);
  }

  // 按比特率排序音频
  private sortAudiosByBitrate(audios: AudioFormat[]): AudioFormat[] {
    return audios.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  }

  // 🎯 优化格式过滤：返回1个4K mp4，1个1080p mp4，1个最高质量m4a，1个最高质量MP3（如有）
  // 完全按照原文件逻辑实现
  private filterTargetFormats(
    videos: VideoFormat[], 
    audios: AudioFormat[]
  ): {
    targetVideos: VideoFormat[];
    targetAudios: AudioFormat[];
  } {
    const targetVideos: VideoFormat[] = [];
    const targetAudios: AudioFormat[] = [];
    
    // 1. 找4K mp4格式视频（如有）
    const video4K = videos
      .filter(v => v.qualityLabel?.includes('2160p') && v.container === 'mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    if (video4K) {
      targetVideos.push(video4K);
      console.log(`✅ 4K mp4: ${video4K.qualityLabel} (${video4K.codecs})`);
    } else {
      console.log(`⚠️ 未找到 4K mp4 格式`);
    }

    // 2. 找1080p mp4格式视频
    const video1080p = videos
      .filter(v => v.qualityLabel?.includes('1080p') && v.container === 'mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    if (video1080p) {
      targetVideos.push(video1080p);
      console.log(`✅ 1080p mp4: ${video1080p.qualityLabel} (${video1080p.codecs})`);
    } else {
      console.log(`⚠️ 未找到 1080p mp4 格式`);
    }

    // 打印可用音频格式用于调试
    console.log(`🔍 可用音频格式:`);
    audios.slice(0, 10).forEach((audio, i) => {
      console.log(`  ${i+1}. itag:${audio.itag} container:${audio.container} codecs:${audio.codecs} bitrate:${audio.bitrate}`);
    });

    // 3. 找最高质量m4a音频（如有）或webm/aac等代替
    let audioM4A = audios
      .filter(a => a.container === 'm4a')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    // 如果没有m4a，寻找AAC编码的音频
    if (!audioM4A) {
      audioM4A = audios
        .filter(a => a.codecs?.toLowerCase().includes('aac') || a.mimeType?.includes('mp4a'))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    }
    
    if (audioM4A) {
      targetAudios.push(audioM4A);
      console.log(`🎵 最高质量 AAC/m4a: ${audioM4A.codecs} ${audioM4A.bitrate}bps (${audioM4A.container})`);
    } else {
      console.log(`⚠️ 未找到 m4a/AAC 音频格式`);
    }

    // 4. 找最高质量MP3音频（如有）或Opus/WebM代替
    let audioMP3 = audios
      .filter(a => a.container === 'mp3')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    // 如果没有MP3，寻找Opus编码的音频作为替代
    if (!audioMP3) {
      audioMP3 = audios
        .filter(a => a.codecs?.toLowerCase().includes('opus') || a.container === 'webm')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    }
    
    if (audioMP3) {
      targetAudios.push(audioMP3);
      console.log(`🎵 最高质量 Opus/MP3: ${audioMP3.codecs} ${audioMP3.bitrate}bps (${audioMP3.container})`);
    } else {
      console.log(`⚠️ 未找到 MP3/Opus 音频格式`);
    }

    console.log(`🎯 优化格式筛选结果: ${targetVideos.length}个视频 + ${targetAudios.length}个音频`);
    
    return { targetVideos, targetAudios };
  }

  // 记录优化结果 - 完全按照原文件逻辑
  private logOptimizationResults(
    originalCount: number,
    finalCount: number,
    videos: VideoFormat[],
    audios: AudioFormat[]
  ): void {
    console.log('🎯 格式优化结果:');
    console.log(`- 原始格式总数: ${originalCount}`);
    console.log(`- 筛选后视频格式: ${videos.length}`);
    console.log(`- 筛选后音频格式: ${audios.length}`);
    console.log(`- 数据减少比例: ${Math.round((1 - finalCount / originalCount) * 100)}%`);
    
    videos.forEach(v => console.log(`  ✅ 视频: ${v.qualityLabel} (${v.codecs})`));
    audios.forEach((a, i) => console.log(`  🎵 音频${i+1}: ${a.codecs} ${a.bitrate}bps`));

    console.log('📊 优化完成统计:');
    console.log(`- 总格式数: ${originalCount} → ${finalCount}`);
    console.log(`- 数据压缩率: ${Math.round((1 - finalCount / originalCount) * 100)}%`);
  }

  // 获取格式统计信息
  public getFormatStats(videos: VideoFormat[], audios: AudioFormat[]): {
    videoCount: number;
    audioCount: number;
    totalSize: number;
    highestQuality: string;
    supportedContainers: string[];
  } {
    const supportedContainers = [
      ...new Set([
        ...videos.map(v => v.container),
        ...audios.map(a => a.container)
      ])
    ];

    const totalSize = [...videos, ...audios].reduce((sum, format) => {
      const size = parseInt(format.contentLength || '0');
      return sum + size;
    }, 0);

    return {
      videoCount: videos.length,
      audioCount: audios.length,
      totalSize,
      highestQuality: videos[0]?.qualityLabel || 'unknown',
      supportedContainers
    };
  }

  // 按容器类型分组格式
  public groupByContainer(videos: VideoFormat[], audios: AudioFormat[]): {
    mp4: VideoFormat[];
    webm: VideoFormat[];
    m4a: AudioFormat[];
    other: (VideoFormat | AudioFormat)[];
  } {
    const result = {
      mp4: [] as VideoFormat[],
      webm: [] as VideoFormat[],
      m4a: [] as AudioFormat[],
      other: [] as (VideoFormat | AudioFormat)[]
    };

    videos.forEach(video => {
      if (video.container === 'mp4') {
        result.mp4.push(video);
      } else if (video.container === 'webm') {
        result.webm.push(video);
      } else {
        result.other.push(video);
      }
    });

    audios.forEach(audio => {
      if (audio.container === 'm4a') {
        result.m4a.push(audio);
      } else {
        result.other.push(audio);
      }
    });

    return result;
  }
}

// 单例实例
export const formatService = new FormatService();