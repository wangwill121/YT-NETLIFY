import { FC } from 'react';

const App: FC = () => {
  const apiEndpoint = '/.netlify/functions/getDownloadLinks';

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
      color: '#333'
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          margin: '0 0 10px 0', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🎥 YouTube Downloader API
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666', margin: '0' }}>
          Professional serverless API for YouTube video download links
        </p>
        <div style={{ marginTop: '20px' }}>
          <span style={{ 
            background: '#28a745', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '15px', 
            fontSize: '0.9rem',
            marginRight: '10px'
          }}>
            ✅ API Status: Online
          </span>
          <span style={{ 
            background: '#17a2b8', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '15px', 
            fontSize: '0.9rem'
          }}>
            v3.0.0 Enterprise
          </span>
        </div>
      </header>

      {/* Quick Start */}
      <section style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          🚀 Quick Start
        </h2>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Basic Usage</h3>
          <pre style={{ 
            background: '#1e1e1e', 
            color: '#d4d4d4', 
            padding: '15px', 
            borderRadius: '6px', 
            overflow: 'auto',
            margin: '0'
          }}>
{`# GET Request
curl "https://preeminent-elf-f65fe5.netlify.app${apiEndpoint}" \\
  -G -d "url=https://www.youtube.com/watch?v=VIDEO_ID"`}
          </pre>
        </div>
      </section>

      {/* API Reference */}
      <section style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          📚 API Reference
        </h2>
        
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#f8f9fa', padding: '15px', borderBottom: '1px solid #e9ecef' }}>
            <h3 style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
              <span style={{ background: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', marginRight: '10px' }}>GET</span>
              <code style={{ fontSize: '1rem' }}>{apiEndpoint}</code>
            </h3>
          </div>
          
          <div style={{ padding: '20px' }}>
            <h4 style={{ color: '#495057', margin: '0 0 10px 0' }}>Parameters</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Parameter</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Required</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}><code>url</code></td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>string</td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>Yes</td>
                  <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>YouTube video URL</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{ color: '#495057', margin: '20px 0 10px 0' }}>Supported URL Formats</h4>
            <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px' }}>
              <li><code>https://www.youtube.com/watch?v=VIDEO_ID</code></li>
              <li><code>https://youtu.be/VIDEO_ID</code></li>
              <li><code>https://youtube.com/shorts/VIDEO_ID</code></li>
              <li><code>https://m.youtube.com/watch?v=VIDEO_ID</code></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          💻 Code Examples
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* JavaScript Example */}
          <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px' }}>
            <div style={{ background: '#495057', color: 'white', padding: '10px', borderRadius: '8px 8px 0 0' }}>
              <strong>JavaScript</strong>
            </div>
            <pre style={{ 
              background: '#1e1e1e', 
              color: '#d4d4d4', 
              padding: '15px', 
              margin: '0',
              fontSize: '0.9rem',
              overflow: 'auto'
            }}>
{`const response = await fetch(
  '${apiEndpoint}?url=' + 
  encodeURIComponent(videoUrl)
);
const data = await response.json();

if (data.status === 'SUCCESS') {
  console.log(data.data.formats);
}`}
            </pre>
          </div>

          {/* Python Example */}
          <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px' }}>
            <div style={{ background: '#495057', color: 'white', padding: '10px', borderRadius: '8px 8px 0 0' }}>
              <strong>Python</strong>
            </div>
            <pre style={{ 
              background: '#1e1e1e', 
              color: '#d4d4d4', 
              padding: '15px', 
              margin: '0',
              fontSize: '0.9rem',
              overflow: 'auto'
            }}>
{`import requests

url = "${apiEndpoint}"
params = {
    "url": "https://youtu.be/dQw4w9WgXcQ"
}

response = requests.get(url, params=params)
data = response.json()

if data["status"] == "SUCCESS":
    print(data["data"]["formats"])`}
            </pre>
          </div>
        </div>
      </section>

      {/* Response Format */}
      <section style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          📄 Response Format
        </h2>
        
        <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px' }}>
          <div style={{ background: '#495057', color: 'white', padding: '10px', borderRadius: '8px 8px 0 0' }}>
            <strong>Success Response</strong>
          </div>
          <pre style={{ 
            background: '#1e1e1e', 
            color: '#d4d4d4', 
            padding: '15px', 
            margin: '0',
            fontSize: '0.9rem',
            overflow: 'auto'
          }}>
{`{
  "status": "SUCCESS",
  "data": {
    "title": "Video Title",
    "duration": "3:45",
    "thumbnail": "https://...",
    "formats": [
      {
        "itag": 299,
        "url": "https://...",
        "mimeType": "video/mp4",
        "quality": "1080p60",
        "hasVideo": true,
        "hasAudio": false
      },
      {
        "itag": 140,
        "url": "https://...",
        "mimeType": "audio/mp4",
        "quality": "medium",
        "hasVideo": false,
        "hasAudio": true
      }
    ]
  },
  "timestamp": "2025-08-13T06:00:00.000Z"
}`}
          </pre>
        </div>
      </section>

      {/* Error Codes */}
      <section style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          ⚠️ Error Codes
        </h2>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '15px', textAlign: 'left', border: '1px solid #dee2e6' }}>Error Type</th>
              <th style={{ padding: '15px', textAlign: 'left', border: '1px solid #dee2e6' }}>Description</th>
              <th style={{ padding: '15px', textAlign: 'left', border: '1px solid #dee2e6' }}>Solution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}><code>INVALID_URL</code></td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Invalid YouTube URL format</td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Check URL format</td>
            </tr>
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}><code>VIDEO_NOT_FOUND</code></td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Video does not exist or is private</td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Verify video is public</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}><code>RATE_LIMITED</code></td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Too many requests</td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Wait and retry</td>
            </tr>
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}><code>UNKNOWN</code></td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>YouTube access restricted</td>
              <td style={{ padding: '15px', border: '1px solid #dee2e6' }}>Try again later</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Rate Limits */}
      <section style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          🚦 Rate Limits & Usage
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '1px solid #bbdefb' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>Rate Limits</h4>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>6 requests per minute per IP</li>
              <li>Automatic rate limit reset</li>
              <li>429 status code when exceeded</li>
            </ul>
          </div>
          
          <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '8px', border: '1px solid #e1bee7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>Timeouts</h4>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>Maximum: 10 seconds</li>
              <li>Average: 3-5 seconds</li>
              <li>Retry recommended on timeout</li>
            </ul>
          </div>
          
          <div style={{ background: '#e8f5e8', padding: '20px', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Best Practices</h4>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>Cache successful responses</li>
              <li>Handle errors gracefully</li>
              <li>Implement retry logic</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '40px 0', 
        borderTop: '1px solid #e9ecef',
        color: '#6c757d',
        fontSize: '0.9rem'
      }}>
        <p style={{ margin: '0 0 10px 0' }}>
          🔧 Powered by Netlify Functions & @distube/ytdl-core
        </p>
        <p style={{ margin: '0' }}>
          📈 Status Page: <a href="https://api.netlify.com/api/v1/badges/9a7c2d52-83f5-4330-8214-72c8c34c0103/deploy-status" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
            Deployment Status
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
