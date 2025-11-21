import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Typography, Divider, Checkbox, Space } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined, GithubOutlined, WindowsOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { LoginRequest } from '../types'

const { Title, Text } = Typography

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [passwordStrength, setPasswordStrength] = React.useState(0)

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    setPasswordStrength(strength)
  }

  const onFinish = async (values: LoginRequest) => {
    setLoading(true)
    const cleanValues = {
      email: values.email.trim(),
      password: values.password.trim()
    }
    try {
      await login(cleanValues)
      message.success('登入成功')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      let errorMsg = '登入失敗'
      
      if (error.response) {
        errorMsg = error.response.data?.message || `伺服器錯誤 (${error.response.status})`
      } else if (error.request) {
        errorMsg = '無法連接到伺服器，請檢查網路或後端狀態'
      } else {
        errorMsg = error.message
      }
      
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#f5f5f7]">
      {/* Colorful Background Blobs for Glass Effect */}
      <motion.div 
        animate={{ 
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.1, 0.9, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/30 blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, -30, 30, 0],
          y: [0, 30, -30, 0],
          scale: [1, 0.9, 1.1, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400/30 blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, 40, -40, 0],
          y: [0, 40, -40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 2 }}
        className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full bg-pink-300/20 blur-[80px] pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-card w-full max-w-[420px] p-10 relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="w-20 h-20 bg-white/50 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl border border-white/60 shadow-lg cursor-pointer transition-all"
          >
            <span className="text-4xl filter drop-shadow-sm">💎</span>
          </motion.div>
          <Title level={2} className="!text-gray-800 !mb-2 !font-light tracking-tight">電商會計系統</Title>
          <Text className="text-gray-500 font-light">E-Commerce Accounting System</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
          className="space-y-4"
          initialValues={{ remember: true }}
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
              prefix={<UserOutlined className="text-gray-400 text-lg" />} 
              placeholder="電子郵件" 
              className="!h-12 !rounded-xl hover:!border-blue-400 focus:!border-blue-500 transition-colors"
            />
          </Form.Item>

          <Form.Item 
            name="password" 
            rules={[{ required: true, message: '請輸入密碼' }]}
            className="mb-2"
          >
            <Input.Password 
              prefix={<LockOutlined className="text-gray-400 text-lg" />} 
              placeholder="密碼" 
              className="!h-12 !rounded-xl hover:!border-blue-400 focus:!border-blue-500 transition-colors"
              onChange={(e) => checkPasswordStrength(e.target.value)}
            />
          </Form.Item>

          {/* Password Strength Indicator */}
          <div className="flex gap-1 mb-6 h-1">
            {[1, 2, 3, 4].map((level) => (
              <div 
                key={level}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  passwordStrength >= level 
                    ? level <= 2 ? 'bg-red-400' : level === 3 ? 'bg-yellow-400' : 'bg-green-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between items-center mb-6">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox className="text-gray-500">記住我</Checkbox>
            </Form.Item>
            <a className="text-blue-500 hover:text-blue-600 text-sm font-medium" href="#">
              忘記密碼？
            </a>
          </div>

          <Form.Item className="mb-6">
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className="w-full !h-12 !rounded-xl !text-lg !font-medium hover:!scale-[1.02] active:!scale-[0.98] transition-transform shadow-lg shadow-blue-500/30"
            >
              登入系統
            </Button>
          </Form.Item>

          <Divider plain className="!text-gray-400 !text-xs !my-6">或使用其他方式登入</Divider>

          <div className="flex justify-center gap-4 mb-6">
            <Button 
              shape="circle" 
              size="large" 
              icon={<GoogleOutlined />} 
              className="!flex !items-center !justify-center hover:!text-red-500 hover:!border-red-500 transition-colors"
            />
            <Button 
              shape="circle" 
              size="large" 
              icon={<GithubOutlined />} 
              className="!flex !items-center !justify-center hover:!text-gray-800 hover:!border-gray-800 transition-colors"
            />
            <Button 
              shape="circle" 
              size="large" 
              icon={<WindowsOutlined />} 
              className="!flex !items-center !justify-center hover:!text-blue-500 hover:!border-blue-500 transition-colors"
            />
          </div>
          
          <div className="text-center">
            <Text className="text-gray-400 text-xs">
              © 2025 MOZTECH. All rights reserved.
            </Text>
          </div>
        </Form>
      </motion.div>
    </div>
  )
}

export default LoginPage
