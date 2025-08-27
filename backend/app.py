from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from sqlalchemy import create_engine
import pandas as pd
import json
import websocket
import io
import time
from binance.client import Client
from pandas.tseries.offsets import MonthEnd
import threading
import logging

app = Flask(__name__)
CORS(app)
engine = create_engine('sqlite:///Cointest.db')
client = Client()

# Add logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def getdata(symbol, start):
    end = str(pd.to_datetime(start) + MonthEnd(0))
    frame = pd.DataFrame(client.get_historical_klines(symbol, '1m', start, end))
    frame = frame.iloc[:, :6]
    frame.columns = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume']
    frame.set_index('Time', inplace=True)
    frame.index = pd.to_datetime(frame.index, unit='ms')
    frame = frame.astype(float)
    return frame

last_write_time = {}

def manipulation(source):
    try:
        kline = source['data']['k']
        symbol = source['data']['s']
        evt_time = pd.to_datetime(source['data']['E'], unit='ms')
        close_price = float(kline['c'])

        now = time.time()
        last = last_write_time.get(symbol, 0)
        if now - last < 10:
            return

        last_write_time[symbol] = now

        df = pd.DataFrame([{
            'Time': evt_time,
            'Open': float(kline['o']),
            'High': float(kline['h']),
            'Low': float(kline['l']),
            'Close': close_price,
            'Volume': float(kline['v'])
        }])
        df.to_sql(symbol, engine, if_exists='append', index=False)
        logger.info(f"Updated {symbol}: {close_price}")
    except Exception as e:
        logger.error(f"Error in manipulation: {e}")

def on_message(ws, message):
    try:
        message = json.loads(message)
        manipulation(message)
    except Exception as e:
        logger.error(f"WebSocket message error: {e}")

def on_error(ws, error):
    logger.error(f"WebSocket error: {error}")

def on_close(ws, close_status_code, close_msg):
    logger.warning("WebSocket connection closed, will retry...")

def on_open(ws):
    logger.info("WebSocket connection opened")

@app.route('/api/historical/<symbol>')
def historical(symbol):
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        as_csv = request.args.get('download') == 'csv'
        query = f"SELECT * FROM {symbol}"
        if start and end:
            query += f" WHERE Time BETWEEN '{start}' AND '{end}'"
        df = pd.read_sql(query, engine)
        if as_csv:
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f"{symbol}_{start}_{end}.csv"
            )
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        logger.error(f"Historical endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/realtime/<symbol>')
def realtime(symbol):
    try:
        df = pd.read_sql(f"SELECT * FROM {symbol} ORDER BY Time DESC LIMIT 1", engine)
        if df.empty:
            logger.warning(f"No data found for {symbol}")
            return jsonify({'error': 'No data available'}), 404
        return jsonify(df.to_dict(orient='records')[0])
    except Exception as e:
        logger.error(f"Realtime endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

# New route for real-time data downloads (only collected data)
@app.route('/api/realtime-history/<symbol>')
def realtime_history(symbol):
    try:
        as_csv = request.args.get('download') == 'csv'
        # Get only the data we've collected in real-time from our database
        df = pd.read_sql(f"SELECT * FROM {symbol} ORDER BY Time ASC", engine)
        if df.empty:
            logger.warning(f"No real-time data found for {symbol}")
            return jsonify({'error': 'No real-time data available'}), 404
            
        if as_csv:
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f"{symbol}_realtime_data.csv"
            )
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        logger.error(f"Realtime history endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

# New route for historical data from Binance API (no database storage)
@app.route('/api/historical-binance/<symbol>')
def historical_binance(symbol):
    try:
        start = request.args.get('start')
        end = request.args.get('end')
        as_csv = request.args.get('download') == 'csv'
        
        if not start or not end:
            return jsonify({'error': 'Start and end dates are required'}), 400
            
        # Convert dates to Binance format
        start_date = pd.to_datetime(start).strftime('%d %b %Y')
        end_date = pd.to_datetime(end).strftime('%d %b %Y')
        
        logger.info(f"Fetching historical data for {symbol} from {start_date} to {end_date}")
        
        # Fetch from Binance API directly (no database storage)
        frame = pd.DataFrame(client.get_historical_klines(symbol, '1d', start_date, end_date))
        
        if frame.empty:
            logger.warning(f"No historical data available for {symbol} from {start_date} to {end_date}")
            return jsonify({'error': 'No data available for this period'}), 404
            
        frame = frame.iloc[:, :6]
        frame.columns = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume']
        frame['Time'] = pd.to_datetime(frame['Time'], unit='ms')
        frame = frame.astype({'Open': float, 'High': float, 'Low': float, 'Close': float, 'Volume': float})
        
        logger.info(f"Successfully fetched {len(frame)} data points for {symbol}")
        
        if as_csv:
            output = io.StringIO()
            frame.to_csv(output, index=False)
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f"{symbol}_historical_{start}_{end}.csv"
            )
        return jsonify(frame.to_dict(orient='records'))
    except Exception as e:
        logger.error(f"Historical Binance endpoint error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': time.time()})

# New route to check database status
@app.route('/api/database-status')
def database_status():
    try:
        coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
        status = {}
        
        for coin in coins:
            try:
                df = pd.read_sql(f"SELECT COUNT(*) as count FROM {coin}", engine)
                status[coin] = {
                    'records': int(df['count'].iloc[0]),
                    'status': 'ok'
                }
            except Exception as e:
                status[coin] = {
                    'records': 0,
                    'status': f'error: {str(e)}'
                }
        
        return jsonify({
            'database': 'connected',
            'coins': status,
            'timestamp': time.time()
        })
    except Exception as e:
        logger.error(f"Database status error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    def run_ws():
        while True:  # Auto-reconnect loop
            try:
                assets = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
                assets = [coin.lower() + '@kline_1m' for coin in assets]
                assets = '/'.join(assets)
                socket = "wss://stream.binance.com:9443/stream?streams="+assets
                ws = websocket.WebSocketApp(
                    socket, 
                    on_message=on_message,
                    on_error=on_error,
                    on_close=on_close,
                    on_open=on_open
                )
                logger.info("Starting WebSocket connection...")
                ws.run_forever()
            except Exception as e:
                logger.error(f"WebSocket failed: {e}")
            
            logger.info("Reconnecting in 5 seconds...")
            time.sleep(5)

    # Start WebSocket in background thread
    threading.Thread(target=run_ws, daemon=True).start()
    
    # Log startup information
    logger.info("=" * 50)
    logger.info("Crypto Real-Time Data Server Starting...")
    logger.info("Monitoring: BTCUSDT, ETHUSDT, BNBUSDT")
    logger.info("Real-time updates every 10 seconds")
    logger.info("Server will be available at: http://localhost:5000")
    logger.info("WebSocket connection starting...")
    logger.info("=" * 50)

    # Start Flask app with host binding
    app.run(debug=True, host='0.0.0.0', port=5000)