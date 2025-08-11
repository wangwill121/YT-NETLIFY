const ytdl = require('@distube/ytdl-core');

exports.handler = async (event, _context) => {
  // 检查请求方法和参数
  if (event.httpMethod !== 'GET' || !event.queryStringParameters || !event.queryStringParameters.url) {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'GET',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        status: 'ERROR', 
        message: 'Method Not Allowed or Missing URL parameter' 
      })
    };
  }

  try {
    // 获取视频URL
    const videoUrl = event.queryStringParameters.url;
    console.log('🎯 Processing video URL:', videoUrl);
    console.log('⏰ Start time:', new Date().toISOString());

    // ✨ @distube/ytdl-core 自动处理所有复杂逻辑：
    // - poToken自动生成 (无需手动配置)
    // - n参数自动生成 (无需JavaScript执行)
    // - 实验标识自动更新 (无需手动维护)
    // - 403错误自动规避 (内置优化)
    
    console.log('🚀 Using @distube/ytdl-core for optimized YouTube access...');
    const info = await ytdl.getInfo(videoUrl, {
      // 使用默认配置，已经包含所有优化
      // 自动选择最佳客户端 (MWEB/WEB_EMBEDDED/IOS/ANDROID)
      // 自动处理poToken和签名
      quality: 'highest'
    });

    const videoDetails = info.videoDetails;
    console.log('✅ Successfully retrieved video info:', videoDetails.title);
    
    // 🔍 调试：检查生成的URL质量
    if (info.formats && info.formats.length > 0) {
      const sampleUrl = info.formats[0].url;
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

    // 获取所有可用格式
    const formats = info.formats;

    // 分离音频和视频格式
    const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);
    const videoFormats = formats.filter(f => f.hasVideo && !f.hasAudio);
    const combinedFormats = formats.filter(f => f.hasAudio && f.hasVideo);

    // ITAG到质量映射
    const itagQualityMap = {
      313: '2160p', 401: '2160p', // 4K
      271: '1440p', 400: '1440p', // 1440p
      137: '1080p', 248: '1080p', 399: '1080p', // 1080p
      136: '720p', 247: '720p', 398: '720p', // 720p
      135: '480p', 134: '360p', 133: '240p', 160: '144p'
    };

    // 提取质量标签
    const getQualityLabel = (format) => {
      if (format.qualityLabel) return format.qualityLabel;
      if (format.height) return `${format.height}p`;
      return itagQualityMap[format.itag] || 'unknown';
    };

    // 处理音频格式
    const audios = audioFormats.map(format => ({
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
      qualityLabel: getQualityLabel(format),
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
      qualityLabel: getQualityLabel(format),
      contentLength: format.contentLength,
      hasUrl: !!format.url,
      hasAudio: true,
      hasVideo: true,
    }));

    // 合并所有视频格式，优先显示组合格式
    const allVideos = [...combinedVideos, ...videos];

    // 按质量排序
    const sortByQuality = (formats) => {
      return formats.sort((a, b) => {
        const getQualityValue = (format) => {
          const match = format.qualityLabel?.match(/(\d+)p/);
          return match ? parseInt(match[1]) : format.height || 0;
        };
        return getQualityValue(b) - getQualityValue(a);
      });
    };

    const sortedVideos = sortByQuality(allVideos);
    const sortedAudios = audios.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    // 获取最佳缩略图
    const thumbnails = videoDetails.thumbnails;
    const bestThumbnail = thumbnails && thumbnails.length > 0 
      ? thumbnails[thumbnails.length - 1] 
      : null;

    // 过滤出有效的格式（有URL的）
    const validAudios = sortedAudios.filter(audio => audio.hasUrl);
    const validVideos = sortedVideos.filter(video => video.hasUrl);

    // 统计高质量格式
    const highQualityCount = validVideos.filter(v => {
      const match = v.qualityLabel?.match(/(\d+)p/);
      const resolution = match ? parseInt(match[1]) : 0;
      return resolution >= 720;
    }).length;

    console.log('📊 Processing complete:', {
      totalFormats: formats.length,
      validFormats: validAudios.length + validVideos.length,
      highQualityFormats: highQualityCount
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'SUCCESS',
        data: {
          title: videoDetails.title,
          thumbnail: bestThumbnail?.url || '',
          duration: parseInt(videoDetails.lengthSeconds?.toString() || '0'),
          audios: validAudios,
          videos: validVideos,
          viewCount: parseInt(videoDetails.viewCount?.toString() || '0'),
          uploadDate: videoDetails.uploadDate || '',
          author: videoDetails.author?.name || 'Unknown',
          // 统计信息
          stats: {
            totalFormats: formats.length,
            validFormats: validAudios.length + validVideos.length,
            audioFormats: validAudios.length,
            videoFormats: validVideos.length,
            highQualityFormats: highQualityCount,
            highestQuality: validVideos[0]?.qualityLabel || 'N/A',
            // 库信息
            library: '@distube/ytdl-core v4.16.12',
            optimized: true,
            implementation: 'CommonJS (fixed)',
            // URL质量检查
            urlQualityScore: info.formats && info.formats.length > 0 ? (() => {
              const sampleUrl = info.formats[0].url;
              const urlObj = new URL(sampleUrl);
              const nParam = urlObj.searchParams.get('n');
              const potParam = urlObj.searchParams.get('pot');
              const sigParam = urlObj.searchParams.get('sig');
              return {
                n: nParam && nParam.length > 10 ? 1 : 0,
                pot: potParam && potParam.length > 200 ? 1 : 0,
                sig: sigParam && sigParam.length > 50 ? 1 : 0,
                total: (nParam && nParam.length > 10 ? 1 : 0) + 
                       (potParam && potParam.length > 200 ? 1 : 0) + 
                       (sigParam && sigParam.length > 50 ? 1 : 0)
              };
            })() : {n: 0, pot: 0, sig: 0, total: 0}
          }
        }
      })
    };
    
  } catch (err) {
    console.error('💥 YouTube Download Error:', err);
    
    // 简化的错误分析
    const is403 = err.message?.includes('403') || err.statusCode === 403;
    const isUnavailable = err.message?.includes('unavailable') || err.message?.includes('private');
    const isAgeRestricted = err.message?.includes('age');
    
    console.error('🎯 Error type:', { is403, isUnavailable, isAgeRestricted });
    
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'ERROR',
        message: err.message || 'Failed to fetch video information',
        errorType: is403 ? '403_FORBIDDEN' : 
                  isUnavailable ? 'VIDEO_UNAVAILABLE' : 
                  isAgeRestricted ? 'AGE_RESTRICTED' : 'UNKNOWN',
        suggestions: is403 ? [
          '403错误检测 - @distube/ytdl-core应该很少出现这个问题',
          '视频可能有地区限制或需要登录'
        ] : isUnavailable ? [
          '视频是私有的、已删除或不可用'
        ] : isAgeRestricted ? [
          '视频有年龄限制'
        ] : [
          '请检查视频URL并重试'
        ],
        debug: {
          timestamp: new Date().toISOString(),
          library: '@distube/ytdl-core v4.16.12',
          implementation: 'CommonJS (fixed)',
          simplified: true
        }
      })
    };
  }
};