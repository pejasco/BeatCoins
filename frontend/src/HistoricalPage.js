import React, { useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

function HistoricalPage() {
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [startDate, setStartDate] = useState('2024-08-26');
  const [endDate, setEndDate] = useState('2025-08-27');
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchHistoricalData = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/historical-binance/${selectedCoin}?start=${startDate}&end=${endDate}`
      );
      
      const data = response.data.map(row => ({
        x: new Date(row.Time),
        y: parseFloat(row.Close)
      }));
      
      setChartData(data);
      console.log(`Loaded ${data.length} historical data points for ${selectedCoin}`);
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      alert('Failed to fetch historical data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadHistoricalData = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await axios.get(
        `/api/historical-binance/${selectedCoin}?start=${startDate}&end=${endDate}&download=csv`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedCoin}_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log(`Downloaded historical data for ${selectedCoin}`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${selectedCoin} Historical Price (${startDate} to ${endDate})`,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd'
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Price (USD)'
        },
        beginAtZero: false
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  });

  const getChartDataForChart = () => ({
    datasets: [
      {
        label: `${selectedCoin} Price`,
        data: chartData,
        borderColor: selectedCoin === 'BTCUSDT' ? '#f7931a' : selectedCoin === 'ETHUSDT' ? '#627eea' : '#f3ba2f',
        backgroundColor: selectedCoin === 'BTCUSDT' ? '#f7931a20' : selectedCoin === 'ETHUSDT' ? '#627eea20' : '#f3ba2f20',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 4,
      },
    ],
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2>Historical Data Analysis</h2>
      
      <div style={{ 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '8px', 
        margin: '20px 0',
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Cryptocurrency:
            </label>
            <select 
              value={selectedCoin} 
              onChange={(e) => setSelectedCoin(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
            >
              {coins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Start Date:
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              End Date:
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
            />
          </div>

          <button 
            onClick={fetchHistoricalData} 
            disabled={isLoading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Loading...' : 'Load Chart'}
          </button>

          <button 
            onClick={downloadHistoricalData} 
            disabled={isDownloading || chartData.length === 0}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: (isDownloading || chartData.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: (isDownloading || chartData.length === 0) ? 0.6 : 1
            }}
          >
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </button>
        </div>
        
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          The data was fetched from the Binance API.
        </p>
      </div>

      {chartData.length > 0 && (
        <div style={{ 
          margin: '20px 0', 
          padding: '15px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          background: 'white'
        }}>
          <div style={{ height: '500px' }}>
            <Line
              data={getChartDataForChart()}
              options={getChartOptions()}
            />
          </div>
          <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>
            Showing {chartData.length} data points
          </p>
        </div>
      )}
    </div>
  );
}

export default HistoricalPage;