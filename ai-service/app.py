import os
import pandas as pd
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from prophet import Prophet

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app) # Allow cross-origin requests

# Get the database URL from the environment
DB_URL = os.getenv("DB_URL")

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

@app.route('/', methods=['GET'])
def index():
    """Test endpoint to ensure the service is running."""
    db_url_status = "loaded" if DB_URL else "not found"
    return jsonify({
        "message": "AI Forecasting Service is running!",
        "db_url_status": db_url_status
    })

@app.route('/predict', methods=['POST'])
def predict_demand():
    """The main forecasting endpoint."""
    
    # 1. Get product_id from the incoming request
    data = request.get_json()
    product_id = data.get('product_id')
    
    if not product_id:
        return jsonify({"error": "product_id is required"}), 400

    conn = None
    try:
        # 2. Connect to the database and fetch sales data
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # This SQL query aggregates sales by day, which is crucial for Prophet
        query = """
        SELECT
            sale_date,
            SUM(quantity) as total_quantity
        FROM
            sales
        WHERE
            product_id = %s
        GROUP BY
            sale_date
        ORDER BY
            sale_date ASC;
        """
        
        # Use Pandas to execute the query and load results into a DataFrame
        df = pd.read_sql(query, conn, params=(product_id,))
        print(f"Fetched {df.shape[0]} rows of sales data for product_id {product_id}")

        # 3. Check if we have enough data to train a model
        if df.shape[0] < 5:
             return jsonify({
                "error": "Not enough sales data to generate a forecast. Please log at least 5 different days of sales."
             }), 400

        # 4. Prepare data for Prophet
        # Prophet requires columns to be named 'ds' (datestamp) and 'y' (value)
        df.rename(columns={'sale_date': 'ds', 'total_quantity': 'y'}, inplace=True)
        df['ds'] = pd.to_datetime(df['ds'])

        # 5. Train the Prophet model
        model = Prophet()
        model.fit(df)

        # 6. Generate a 30-day future forecast
        future = model.make_future_dataframe(periods=30)
        forecast = model.predict(future)
        
        # 7. Format the forecast for a clean JSON response
        # We only care about the future predictions, not the historical ones
        future_forecast = forecast[forecast['ds'] > df['ds'].max()]
        
        # Select only the columns we need for the chart
        response_data = future_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        
        # Convert datestamps to a clean string format
        response_data['ds'] = response_data['ds'].dt.strftime('%Y-%m-%d')
        
        # Convert DataFrame to a list of dictionaries (JSON-friendly)
        final_forecast = response_data.to_dict('records')

        return jsonify({
            "message": "Forecast generated successfully",
            "product_id": product_id,
            "forecast": final_forecast
        })

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500
    finally:
        if conn:
            conn.close() # Always close the database connection

if __name__ == '__main__':
    app.run(debug=True, port=5000)