import { useState } from 'react';
import { supabase } from './supabaseClient';
import { Form, Input, Button, message, Typography, Card, Layout } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // Toggle state
  const [form] = Form.useForm();

  const handleAuth = async (values) => {
    setLoading(true);
    const { email, password } = values;

    try {
      if (isLogin) {
        // Handle Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        message.success('Logged in successfully!');
      } else {
        // Handle Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        message.success('Sign up successful! Please check your email to confirm.');
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        <Card
          style={{ 
            width: 400, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
            borderRadius: '8px' 
          }}
          bordered={false}
        >
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <Title level={2} style={{ color: '#1677ff', marginBottom: 5 }}>
              Predictive Inventory
            </Title>
            <Text type="secondary">
              {isLogin ? 'Welcome back! Please log in.' : 'Create an account to get started.'}
            </Text>
          </div>

          <Form
            form={form}
            name="auth_form"
            layout="vertical"
            onFinish={handleAuth}
            size="large"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input 
                prefix={<MailOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
                placeholder="Email" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                placeholder="Password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ marginTop: 10, fontWeight: 500 }}
              >
                {isLogin ? 'Log In' : 'Sign Up'}
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <Text style={{ color: '#8c8c8c' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <a
                onClick={(e) => {
                  e.preventDefault();
                  setIsLogin(!isLogin);
                  form.resetFields();
                }}
                style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </a>
            </Text>
          </div>
        </Card>
      </Content>
    </Layout>
  );
}