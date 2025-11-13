import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Button, Menu, Flex } from 'antd'; // Use AntD components
import { HomeOutlined, LineChartOutlined, AppstoreOutlined, ShoppingOutlined, LogoutOutlined, ShopOutlined } from '@ant-design/icons';

export default function Navbar() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Flex align="center" justify="space-between" style={{ padding: '0 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <Flex align="center" gap="middle">
        <Title level={4} style={{ margin: 0, color: '#1677ff' }}>📈 Intelligent Inventory</Title>
        <Menu mode="horizontal" defaultSelectedKeys={['home']}>
          <Menu.Item key="home" icon={<HomeOutlined />}>
            <Link to="/">Dashboard</Link>
          </Menu.Item>
          {/* NEW LINK */}
          <Menu.Item key="marketplace" icon={<ShopOutlined />}>
            <Link to="/marketplace">Marketplace</Link>
          </Menu.Item>
          <Menu.Item key="forecast" icon={<LineChartOutlined />}>
            <Link to="/forecast">Forecast</Link>
          </Menu.Item>
          <Menu.Item key="sales" icon={<ShoppingOutlined />}>
            <Link to="/sales">Log Sales</Link>
          </Menu.Item>
          <Menu.Item key="products" icon={<AppstoreOutlined />}>
            <Link to="/products">Products</Link>
          </Menu.Item>
        </Menu>
      </Flex>
      <Button 
        type="default" 
        icon={<LogoutOutlined />} 
        onClick={handleLogout}
      >
        Log Out
      </Button>
    </Flex>
  );
}

// We need to import Title, but it's not exported from antd directly.
// A small hack to make this file runnable:
import { Typography } from 'antd';
const { Title } = Typography;