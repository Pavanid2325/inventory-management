// client/src/Products.jsx

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider';
// 1. Import AntD components
import { Table, Button, Modal, Form, Input, message, Flex, Typography } from 'antd';

const { Title } = Typography;
const { useForm } = Form;

export default function Products() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  
  // States for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = useForm(); // Hook to control the form

  // 2. Define the columns for the AntD Table
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    // We can add an 'Actions' column here later (e.g., delete)
  ];

  // 3. Fetch products (same logic as before)
  useEffect(() => {
    getProducts();
  }, [session]);

  const getProducts = async () => {
    try {
      setLoading(true);
      const { user } = session;
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setProducts(data);

    } catch (error) {
      message.error(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle the "Add Product" form submission
  const handleAddProduct = async (values) => {
    try {
      setFormLoading(true);
      const { user } = session;
      const { productName, productSku } = values;

      const { error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: productName,
          sku: productSku,
        });

      if (error) throw error;

      message.success('Product added successfully!');
      form.resetFields(); // Clear the form
      setIsModalOpen(false); // Close the modal
      getProducts(); // Re-fetch the product list

    } catch (error) {
      message.error(error.error_description || error.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="product-widget">
      
      {/* 5. The new Header and "Add Product" Button */}
      <Flex justify="space-between" align="center">
        <Title level={3} style={{ margin: 0 }}>Manage Products</Title>
        <Button 
          type="primary" 
          onClick={() => setIsModalOpen(true)}
        >
          Add New Product
        </Button>
      </Flex>

      {/* 6. The new AntD Table */}
      <Table
        style={{ marginTop: '20px' }}
        columns={columns}
        dataSource={products}
        loading={loading}
        rowKey="product_id" // Use the unique product_id as the key
      />

      {/* 7. The new "Add Product" Modal */}
      <Modal
        title="Add New Product"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null} // We'll use the form's button
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddProduct}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="productName"
            label="Product Name"
            rules={[{ required: true, message: 'Please enter a product name' }]}
          >
            <Input placeholder="e.g., House Blend" />
          </Form.Item>

          <Form.Item
            name="productSku"
            label="SKU (Optional)"
          >
            <Input placeholder="e.g., HB-001" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={formLoading}>
              Save Product
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}