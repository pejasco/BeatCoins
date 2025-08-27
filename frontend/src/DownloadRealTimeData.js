import React, { useState } from 'react';
import axios from 'axios';

const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

function DownloadRealTimeData() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadRealTimeData = async (symbol) => {
    setIsDownloading(true);
    try {
      const response = await axios.get(
        `/api/realtime-history/${symbol}?download=csv`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${symbol}_realtime_data.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log(`Downloaded real-time data for ${symbol}`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAllRealTimeData = async () => {
    setIsDownloading(true);
    try {
      for (const coin of coins) {
        await downloadRealTimeData(coin);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ 
      padding: '15px', 
      background: '#e3f2fd', 
      borderRadius: '8px', 
      margin: '20px 0',
      border: '1px solid #2196f3'
    }}>
      <h4 style={{ marginTop: '0', color: '#1976d2' }}>
         Download Real-Time Data
      </h4>
      <p style={{ margin: '5px 0 15px 0', color: '#666', fontSize: '14px' }}>
        Download only the newly collected real-time data from our live stream
      </p>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {coins.map(coin => (
          <button 
            key={coin}
            onClick={() => downloadRealTimeData(coin)} 
            disabled={isDownloading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isDownloading ? 0.6 : 1
            }}
          >
            {coin}
          </button>
        ))}
        
        <button 
          onClick={downloadAllRealTimeData} 
          disabled={isDownloading}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#4caf50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isDownloading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: isDownloading ? 0.6 : 1
          }}
        >
          {isDownloading ? 'Downloading...' : 'Download All'}
        </button>
      </div>
    </div>
  );
}

export default DownloadRealTimeData;