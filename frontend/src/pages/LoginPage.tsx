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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景裝飾光暈 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none"></div>

      <div className="glass-card w-full max-w-[420px] p-10 animate-fade-in relative z-10 border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl border border-white/20 shadow-lg">
            <span className="text-4xl filter drop-shadow-lg">💎</span>
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 300, letterSpacing: '1px' }}>電商會計系統</Title>
          <Text className="text-white/50 mt-3 block font-light">E-Commerce Accounting System</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
          className="space-y-4"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '請輸入電子郵件' },
              { type: 'email', message: '請輸入有效的電子郵件' },
            ]}
            className="mb-4"
          >
            <Input 
              prefix={<UserOutlined className="text-white/50 text-lg" />} 
              placeholder="電子郵件" 
              className="!bg-white/5 !border-white/10 !text-white hover:!border-white/30 focus:!border-blue-400/50 !h-12 !rounded-xl"
            />
          </Form.Item>

          <Form.Item 
            name="password" 
            rules={[{ required: true, message: '請輸入密碼' }]}
            className="mb-8"
          >
            <Input.Password 
              prefix={<LockOutlined className="text-white/50 text-lg" />} 
              placeholder="密碼" 
              className="!bg-white/5 !border-white/10 !text-white hover:!border-white/30 focus:!border-blue-400/50 !h-12 !rounded-xl"
            />
          </Form.Item>

          <Form.Item className="mb-4">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              className="!h-12 !text-lg !font-medium !rounded-xl !bg-gradient-to-r !from-blue-600 !to-blue-500 hover:!from-blue-500 hover:!to-blue-400 !border-none shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              登入系統
            </Button>
          </Form.Item>

          <div className="text-center space-y-2 mt-8 pt-6 border-t border-white/5">
            <Text className="text-white/30 text-xs block">
              © 2025 MOZTECH Company. All rights reserved.
            </Text>
            <div className="text-white/20 text-xs font-mono">
              Demo: admin@example.com / Admin@123456
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default LoginPage
