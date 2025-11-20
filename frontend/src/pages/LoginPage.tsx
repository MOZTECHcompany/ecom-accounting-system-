import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { LoginRequest } from '../types'

const { Title, Text } = Typography

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = React.useState(false)

  const onFinish = async (values: LoginRequest) => {
    setLoading(true)
    try {
      await login(values)
      message.success('登入成功')
      navigate('/dashboard')
    } catch (error: any) {
      message.error(error.response?.data?.message || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
            <span className="text-3xl">💎</span>
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>電商會計系統</Title>
          <Text className="text-white/60 mt-2 block">請登入您的帳戶以繼續</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '請輸入電子郵件' },
              { type: 'email', message: '請輸入有效的電子郵件' },
            ]}
          >
            <Input 
              prefix={<UserOutlined className="text-white/50" />} 
              placeholder="電子郵件" 
              className="glass-input"
            />
          </Form.Item>

          <Form.Item 
            name="password" 
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-white/50" />} 
              placeholder="密碼" 
              className="glass-input"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              className="h-12 text-lg font-medium shadow-lg shadow-blue-500/30"
            >
              登入系統
            </Button>
          </Form.Item>

          <div className="text-center text-white/40 text-sm mt-6">
            預設帳號: admin@example.com<br />
            預設密碼: Admin@123456
          </div>
        </Form>
      </div>
    </div>
  )
}

export default LoginPage
