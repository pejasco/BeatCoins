import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RealTimeLineChart from './RealTimeLineChart';

const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

function RealTimePage() {
  const [prices, setPrices] = useState({});
  const [previousPrices, setPreviousPrices] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchPrices = () => {
      coins.forEach(symbol => {
        axios.get(`/api/realtime/${symbol}`)
          .then(res => {
            const newPrice = parseFloat(res.data.Close);
            setPreviousPrices(prev => ({ 
              ...prev, 
              [symbol]: prev[symbol] !== undefined ? prev[symbol] : newPrice 
            }));
            setPrices(prevPrices => {
              setPreviousPrices(prevPrev => ({ 
                ...prevPrev, 
                [symbol]: prevPrices[symbol] || newPrice 
              }));
              return { ...prevPrices, [symbol]: newPrice };
            });
          })
          .catch(err => {
            console.error(`Error fetching price for ${symbol}:`, err);
          });
      });
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); 
    return () => clearInterval(interval);
  }, []); 

  const formatPrice = (price) => {
    if (!price) return 'Loading...';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getPriceColor = (symbol) => {
    const currentPrice = prices[symbol];
    const prevPrice = previousPrices[symbol];
    
    if (!currentPrice || !prevPrice) return '#333';
    
    if (currentPrice >= prevPrice) {
      return '#28a745'; 
    } else {
      return '#dc3545'; 
    }
  };

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
      alert('All files downloaded successfully!');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      <h2>Real-Time Spot Rates</h2>
      
      {/* Download Real-Time Data Section */}
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

      {/* Price Table */}
      <table style={{ 
        borderCollapse: 'collapse', 
        width: 'auto', 
        marginBottom: '30px',
        border: '1px solid #ddd'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ 
              padding: '12px 15px', 
              textAlign: 'left', 
              borderBottom: '2px solid #ddd',
              fontSize: '16px',
              fontWeight: 'bold',
              minWidth: '120px'
            }}>Coin</th>
            <th style={{ 
              padding: '12px 15px', 
              textAlign: 'right', 
              borderBottom: '2px solid #ddd',
              fontSize: '16px',
              fontWeight: 'bold',
              minWidth: '150px'
            }}>Current Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          {coins.map(symbol => (
            <tr key={symbol} style={{ 
              borderBottom: '1px solid #eee',
              transition: 'background-color 0.2s'
            }}>
              <td style={{ 
                padding: '15px', 
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>{symbol}</td>
              <td style={{ 
                padding: '15px', 
                fontSize: '16px',
                fontWeight: '600',
                color: getPriceColor(symbol),
                textAlign: 'right',
                transition: 'color 0.3s ease'
              }}>{formatPrice(prices[symbol])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <hr style={{ margin: '40px 0', border: 'none', borderTop: '2px solid #eee' }} />
      <h2>Real-Time Line Charts</h2>
      <RealTimeLineChart />
    </div>
  );
}

export default RealTimePage;