import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider';
import { Table, Button, Modal, Form, Input, InputNumber, message, Flex, Typography, Tag } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
const { Title, Text } = Typography;
const { useForm } = Form;

export default function Marketplace() {
  const { session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form] = useForm();

  // === WORKFLOW 1: FETCH INITIAL DATA ===
  useEffect(() => {
    const getOpenRequests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_requests')
        .select('*')
        .eq('status', 'open') // Only get open requests
        .order('created_at', { ascending: false });
      
      if (error) {
        message.error("Failed to fetch requests: " + error.message);
      } else {
        setRequests(data);
      }
      setLoading(false);
    };
    getOpenRequests();
  }, []);

  // === WORKFLOW 2: LISTEN FOR REAL-TIME CHANGES ===
  // This is the key "real-time" feature
  useEffect(() => {
    const channel = supabase
      .channel('stock_requests_realtime')
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'stock_requests' 
        }, 
        (payload) => {
          console.log('Real-time change received!', payload);
          // If a new request is added
          if (payload.eventType === 'INSERT') {
            setRequests(currentRequests => [payload.new, ...currentRequests]);
          }
          // If a request is fulfilled (updated)
          if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'fulfilled') {
              // Remove the fulfilled request from the 'open' list
              setRequests(currentRequests => 
                currentRequests.filter(req => req.id !== payload.new.id)
              );
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // === WORKFLOW 3: CREATE A NEW REQUEST ===
  const handleCreateRequest = async (values) => {
    setFormLoading(true);
    try {
      const { user } = session;
      const { error } = await supabase.from('stock_requests').insert({
        product_name: values.productName,
        quantity_needed: values.quantity,
        requesting_user_id: user.id,
        requesting_user_email: user.email,
        status: 'open'
      });

      if (error) throw error;
      message.success('Stock request posted!');
      form.resetFields();
      setIsModalOpen(false);
    } catch (error) {
      message.error(error.error_description || error.message);
    } finally {
      setFormLoading(false);
    }
  };
  
  // === WORKFLOW 4: FULFILL A REQUEST ===
  const handleFulfillRequest = async (record) => {
    try {
      const { user } = session;
      if (record.requesting_user_id === user.id) {
        message.error("You cannot fulfill your own stock request.");
        return;
      }
      
      const { error } = await supabase
        .from('stock_requests')
        .update({
          status: 'fulfilled',
          fulfilled_by_user_id: user.id,
          fulfilled_by_user_email: user.email
        })
        .eq('id', record.id);
      
      if (error) throw error;
      message.success('Request fulfilled!');
      // The real-time listener will handle removing this from the UI
      
    } catch (error) {
      message.error(error.error_description || error.message);
    }
  };

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Quantity Needed',
      dataIndex: 'quantity_needed',
      key: 'quantity_needed',
      sorter: (a, b) => a.quantity_needed - b.quantity_needed,
    },
    {
      title: 'Requested By',
      dataIndex: 'requesting_user_email',
      key: 'requesting_user_email',
    },
    {
      title: 'Date Posted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).fromNow(),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          onClick={() => handleFulfillRequest(record)}
          disabled={record.requesting_user_id === session?.user.id}
        >
          Fulfill
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center">
        <Title level={3} style={{ margin: 0 }}>B2B Marketplace</Title>
        <Button 
          type="primary" 
          onClick={() => setIsModalOpen(true)}
        >
          Request Stock
        </Button>
      </Flex>
      <Text>Fulfill open stock requests from your peers. All changes are real-time.</Text>

      <Table
        style={{ marginTop: '20px' }}
        columns={columns}
        dataSource={requests}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title="Create Stock Request"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
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
            name="quantity"
            label="Quantity Needed"
            rules={[{ required: true, message: 'Please enter a quantity' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g., 50" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={formLoading}>
              Post Request
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}