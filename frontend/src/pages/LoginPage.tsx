import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { LoginRequest } from '../types'

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="電商會計系統" style={{ width: 400 }}>
        <Form name="login" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '請輸入電子郵件' },
              { type: 'email', message: '請輸入有效的電子郵件' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="電子郵件" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '請輸入密碼' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密碼" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登入
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', color: '#999' }}>
            預設帳號: admin@example.com<br />
            預設密碼: Admin@123456
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage
