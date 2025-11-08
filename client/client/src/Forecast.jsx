import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider';
import axios from 'axios'; // We'll use axios to call our OWN server

// Import chart components
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // For the confidence interval
} from 'chart.js';

// Register the chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// This is the address of YOUR Node.js server
const API_SERVER_URL = 'http://localhost:5001';

export default function Forecast() {
  const { session } = useSession();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State to hold the chart data
  const [chartData, setChartData] = useState(null);

  // 1. Fetch products for the dropdown
  useEffect(() => {
    const getProducts = async () => {
      const { user } = session;
      let { data, error } = await supabase
        .from('products')
        .select('product_id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
      } else if (data) {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProduct(data[0].product_id);
        }
      }
    };
    getProducts();
  }, [session]);

  // 2. The function that calls your Node.js server
  const handleGetForecast = async () => {
    if (!selectedProduct) {
      alert('Please select a product.');
      return;
    }

    setLoading(true);
    setError(null);
    setChartData(null); // Clear old chart

    try {
      // --- THIS IS THE KEY ---
      // Get the user's access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You are not logged in.');
      }
      const token = session.access_token;

      // Call your Node.js server's new endpoint
      const response = await axios.get(
        `${API_SERVER_URL}/api/forecast/${selectedProduct}`,
        {
          headers: {
            // Send the token for security
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // 3. Process the forecast data from your server
      const forecast = response.data.forecast;
      if (forecast && forecast.length > 0) {
        // Format the data for Chart.js
        const labels = forecast.map(d => d.ds); // Dates
        const predictions = forecast.map(d => Math.max(0, d.yhat)); // Predicted value, min 0
        const lowerConfidence = forecast.map(d => Math.max(0, d.yhat_lower));
        const upperConfidence = forecast.map(d => Math.max(0, d.yhat_upper));

        setChartData({
          labels,
          datasets: [
            {
              label: 'Predicted Sales',
              data: predictions,
              borderColor: '#36A2EB',
              backgroundColor: '#36A2EB',
              tension: 0.1,
            },
            {
              label: 'Confidence Interval',
              data: upperConfidence,
              fill: '+1', // Fill to the next dataset (index 2)
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(0,0,0,0)',
              pointRadius: 0,
            },
            {
              label: 'Confidence Interval (Lower)',
              data: lowerConfidence,
              fill: false, // Don't fill
              borderColor: 'rgba(0,0,0,0)',
              pointRadius: 0,
            },
          ],
        });
      } else {
        setError('No forecast data returned.');
      }

    } catch (error) {
      console.error('Error fetching forecast:', error);
      // Get the specific error from the AI service
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to fetch forecast.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forecast-widget" style={{marginTop: '30px'}}>
      <h2>📈 AI Demand Forecast</h2>
      <p>Select a product to forecast its demand for the next 30 days.</p>
      
      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
        <select
          className="inputField"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          style={{flexGrow: 1}}
        >
          {products.map((product) => (
            <option key={product.product_id} value={product.product_id}>
              {product.name}
            </option>
          ))}
        </select>
        <button className="button" onClick={handleGetForecast} disabled={loading}>
          {loading ? 'Forecasting...' : 'Get Forecast'}
        </button>
      </div>

      {/* 4. Display the chart, loading state, or error */}
      <div className="chart-container" style={{marginTop: '20px'}}>
        {loading && <p>Generating forecast... (this may take a moment)</p>}
        {error && <p style={{color: 'red'}}>{error}</p>}
        {chartData && (
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '30-Day Sales Forecast' },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}