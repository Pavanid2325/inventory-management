import './styles/App.css';
import { useSession } from './SessionProvider';
import { Routes, Route } from 'react-router-dom';
import Auth from './Auth';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import Products from './Products';
import SalesLogger from './SalesLogger';
import Forecast from './Forecast';
import Marketplace from './MarketPlace'; 
import { Layout } from 'antd'; // Import AntD Layout

const { Content } = Layout;

function App() {
  const { session } = useSession();

  // If the user is NOT logged in, only show the Auth page
  if (!session) {
    return (
      <div className="container" style={{maxWidth: '400px', paddingTop: '10vh'}}>
        <Auth />
      </div>
    );
  }

  // If the user IS logged in, show the full app layout
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Content style={{ padding: '20px 40px' }}>
        <Routes>
          {/* 2. Add the new route */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<SalesLogger />} />
          <Route path="/forecast" element={<Forecast />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;