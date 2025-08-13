import axios from 'axios';
import { FC, useEffect, useState } from 'react';

interface ErrorInfo {
  message: string;
  type: string;
  retryAfter?: number;
}

const App: FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🚀 Starting request with 15s timeout...');
        const startTime = Date.now();
        
        const response = await axios.get(
          '/.netlify/functions/getDownloadLinks?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DF_oOtaxb0L8',
          {
            timeout: 15000, // 15秒前端超时
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const endTime = Date.now();
        console.log(`✅ Request completed in ${endTime - startTime}ms`);
        console.log('📊 Response data:', response.data);
        
        setData(response.data);
        setError(null);
        
      } catch (err: any) {
        console.error('💥 Request failed:', err);
        
        let errorInfo: ErrorInfo = {
          message: 'Unknown error occurred',
          type: 'UNKNOWN'
        };

        if (err.code === 'ECONNABORTED') {
          // 前端超时
          errorInfo = {
            message: '请求超时，请稍后重试',
            type: 'FRONTEND_TIMEOUT'
          };
        } else if (err.response) {
          // 服务器响应了错误
          const responseData = err.response.data;
          errorInfo = {
            message: responseData.message || 'Server error',
            type: responseData.errorCode || 'SERVER_ERROR',
            retryAfter: responseData.retryAfter
          };
        } else if (err.request) {
          // 网络错误
          errorInfo = {
            message: '网络连接失败，请检查网络连接',
            type: 'NETWORK_ERROR'
          };
        }

        setError(errorInfo);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <div>⏳ Loading...</div>
        <div style={{ color: '#666', fontSize: '12px' }}>
          Timeout: 15 seconds
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', color: 'red' }}>
        <div>❌ Error: {error.type}</div>
        <div>{error.message}</div>
        {error.retryAfter && (
          <div style={{ color: '#666', fontSize: '12px' }}>
            Retry after: {error.retryAfter} seconds
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: '10px', color: 'green' }}>
        ✅ Success! Data loaded.
      </div>
      <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default App;
