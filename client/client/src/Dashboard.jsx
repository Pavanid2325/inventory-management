import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider.jsx'; 
import Products from './Products';
import SalesLogger from './SalesLogger';
import Forecast from './forecast.jsx';

export default function Dashboard() {
  // Get the session from our context
  const { session } = useSession();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.error_description || error.message);
    }
  };

  return (
      <div className="container" style={{ paddingTop: '50px', maxWidth: '1000px' }}>
      <button className="button" onClick={handleLogout} style={{float: 'right'}}>
        Log Out
      </button>
      <h1>Welcome!</h1>
      <p>
        You are logged in as: <strong>{session?.user.email}</strong>
      </p>
      <Forecast />

      <hr style={{ margin: '20px 0' }} />
      <div className="dashboard-layout">
        <div className="sales-logger-container">
          <SalesLogger />
        </div>
        <div className="products-container">
          <Products />
        </div>
      </div>
    </div>
  );
}