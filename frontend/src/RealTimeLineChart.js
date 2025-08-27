import React, { useEffect, useRef } from 'react';
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

function RealTimeLineChart() {
  const chartData = useRef({
    BTCUSDT: [],
    ETHUSDT: [],
    BNBUSDT: []
  });
  
  const chartRefs = useRef({});
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    coins.forEach(symbol => {
      axios.get(`/api/realtime/${symbol}`)
        .then(res => {
          console.log(`Raw time from backend:`, res.data.Time);
          console.log(`Converted to local time:`, new Date(res.data.Time));
          console.log(`Your browser timezone:`, Intl.DateTimeFormat().resolvedOptions().timeZone);

          chartData.current[symbol] = [{
            x: new Date(res.data.Time + 'Z'),
            y: parseFloat(res.data.Close)
          }];
          forceUpdate();
          console.log(`Initial data loaded for ${symbol}:`, res.data.Close);
        })
        .catch(err => console.error(`Error fetching initial data for ${symbol}:`, err));
    });

    const interval = setInterval(() => {
      coins.forEach(symbol => {
        axios.get(`/api/realtime/${symbol}`)
          .then(res => {
            const newPoint = {
              x: new Date(res.data.Time + 'Z'),
              y: parseFloat(res.data.Close)
            };
            
            chartData.current[symbol].push(newPoint);
            if (chartData.current[symbol].length > 60) {
              chartData.current[symbol].shift();
            }
            
            const chart = chartRefs.current[symbol];
            if (chart) {
              chart.data.datasets[0].data = [...chartData.current[symbol]];
              chart.update('none'); 
            }
            
            console.log(`Updated ${symbol} with price:`, res.data.Close);
          })
          .catch(err => console.error(`Error updating ${symbol}:`, err));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getChartOptions = (symbol) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${symbol} Real-Time Price`,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        title: {
          display: true,
          text: 'Time'
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
    animation: {
      duration: 500,
      easing: 'easeInOutQuad'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  });

  const getChartData = (symbol) => ({
    datasets: [
      {
        label: `${symbol} Price`,
        data: chartData.current[symbol] || [],
        borderColor: symbol === 'BTCUSDT' ? '#f7931a' : symbol === 'ETHUSDT' ? '#627eea' : '#f3ba2f',
        backgroundColor: symbol === 'BTCUSDT' ? '#f7931a20' : symbol === 'ETHUSDT' ? '#627eea20' : '#f3ba2f20',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  });

  return (
    <div>
      <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px' }}>
        <h3>Real-Time Charts</h3>
        <p>Charts update every 5 seconds with latest price data</p>
      </div>
      {coins.map(symbol => (
        <div key={symbol} style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>{symbol}</h4>
          <div style={{ height: '400px' }}>
            <Line
              ref={el => (chartRefs.current[symbol] = el)}
              data={getChartData(symbol)}
              options={getChartOptions(symbol)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default RealTimeLineChart;

