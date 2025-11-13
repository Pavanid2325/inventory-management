
import { useSession } from './SessionProvider';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { session } = useSession();

  return (
    <div style={{ paddingTop: '50px' }}>
      <h1>Welcome, {session?.user.email}!</h1>
      <p>This is your central dashboard. Select a task to get started.</p>

      <div className="dashboard-links">
        <Link to="/forecast" className="dashboard-link-card">
          <h3>📈 AI Forecast</h3>
          <p>Predict future demand for your products.</p>
        </Link>
        <Link to="/sales" className="dashboard-link-card">
          <h3>📝 Log Sales</h3>
          <p>Enter your new sales data to feed the AI.</p>
        </Link>
        <Link to="/products" className="dashboard-link-card">
          <h3>📦 Manage Products</h3>
          <p>Add, edit, or view your product list.</p>
        </Link>
      </div>
    </div>
  );
}