import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider';
import Papa from 'papaparse'; // Import CSV parser
import {
  Form,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Upload,
  message,
  Typography,
  Divider,
  Alert
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { Title, Text, Link } = Typography;
const { useForm } = Form;
const API_SERVER_URL = 'http://localhost:5001';

// Main Component
export default function SalesLogger() {
  const [products, setProducts] = useState([]);
  const [productKey, setProductKey] = useState(0); // Add a key to force re-render
  
  // Fetch products for the dropdown
  const getProducts = async () => {
    let { data, error } = await supabase
      .from('products')
      .select('product_id, name')
      .order('name', { ascending: true });

    if (error) {
      message.error("Could not fetch products: " + error.message);
    } else if (data) {
      setProducts(data.map(p => ({ label: p.name, value: p.product_id })));
    }
  };
  
  useEffect(() => {
    getProducts();
  }, []);

  // We pass this function down to the uploader so it can tell this
  // component to re-fetch the product list after an upload.
  const refreshProducts = () => {
    getProducts();
    setProductKey(prevKey => prevKey + 1); // Change the key
  };

  return (
    <div>
      <Title level={3}>Log Sales</Title>
      <Text>Log individual sales or bulk upload a CSV file.</Text>
      
      <Divider />
      <Title level={4}>Log a Single Sale</Title>
      {/* We pass the key here, so if it changes, the Select box re-renders */}
      <SingleSaleForm products={products} key={productKey} />
      
      <Divider />
      <Title level={4}>Bulk Upload Sales</Title>
      <SalesUploader onUploadSuccess={refreshProducts} />
    </div>
  );
}

// Sub-component for the single sale form
function SingleSaleForm({ products }) {
  const [form] = useForm();
  const [loading, setLoading] = useState(false);
  const { session } = useSession();

  const handleLogSale = async (values) => {
    setLoading(true);
    try {
      const { user } = session;
      const { error } = await supabase.from('sales').insert({
        product_id: values.productId,
        user_id: user.id,
        sale_date: values.saleDate.format('YYYY-MM-DD'),
        quantity: values.quantity,
      });

      if (error) throw error;
      message.success('Sale logged. Thank you!');
      form.resetFields();
    } catch (error) {
      message.error(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleLogSale}
      initialValues={{ saleDate: dayjs() }}
    >
      <Form.Item
        name="productId"
        label="Product"
        rules={[{ required: true, message: 'Please select a product' }]}
      >
        <Select showSearch options={products} placeholder="Select a product" />
      </Form.Item>
      
      <Form.Item
        name="saleDate"
        label="Date of Sale"
        rules={[{ required: true, message: 'Please select a date' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      
      <Form.Item
        name="quantity"
        label="Quantity Sold"
        rules={[{ required: true, message: 'Please enter a quantity' }]}
      >
        <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g., 10" />
      </Form.Item>
      
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Log Sale
        </Button>
      </Form.Item>
    </Form>
  );
}

// Sub-component for the CSV Uploader
function SalesUploader({ onUploadSuccess }) { // Receive the refresh function
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  
  const handleUpload = async ({ file }) => {
    setLoading(true);
    setFileList([file]);

    // 1. Parse the CSV file using PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const salesData = results.data.filter(
          row => row.product_name && row.sale_date && row.quantity
        );
        
        // 2. Send the parsed JSON to our backend
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('You are not logged in.');
          const token = session.access_token;

          const response = await axios.post(
            `${API_SERVER_URL}/api/sales/bulk-upload`,
            { sales: salesData },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const { failed_rows, message: successMessage } = response.data;
          
          if (failed_rows > 0) {
            message.warning(`${successMessage} ${failed_rows} rows failed to import. Check console for details.`);
            console.warn("Failed rows:", response.data.failures);
          } else {
            message.success(successMessage);
          }
          
          // Refresh the product list in the parent component
          if (response.data.message.includes("new products created")) {
            onUploadSuccess();
          }

        } catch (error) {
          message.error("Upload failed: " + (error.response?.data?.error || error.message));
        } finally {
          setLoading(false);
          setFileList([]);
        }
      },
      error: (error) => {
        message.error("Failed to parse CSV: " + error.message);
        setLoading(false);
      }
    });
    
    // Prevent default upload behavior
    return false;
  };

  return (
    <>
      <Alert
        message="Your CSV must have columns: product_name, sale_date, and quantity."
        description={
          <>
            If a <strong>product_name</strong> is not found in your Products list,
            a new product will be <strong>automatically created</strong> for you.
            <br />
            The <strong>sale_date</strong> should be in YYYY-MM-DD format.
          </>
        }
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />
      
      <Upload
        accept=".csv"
        beforeUpload={() => false} // Prevent automatic upload
        onChange={handleUpload}
        fileList={fileList}
        maxCount={1}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          {loading ? 'Processing...' : 'Click to Upload CSV'}
        </Button>
      </Upload>
    </>
  );
}