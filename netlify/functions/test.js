// 极简测试函数
exports.handler = async (event, _context) => {
  console.log('🧪 Test function called');
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'SUCCESS',
      message: '@distube/ytdl-core function is working',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      url: event.queryStringParameters?.url || 'no url provided'
    })
  };
};