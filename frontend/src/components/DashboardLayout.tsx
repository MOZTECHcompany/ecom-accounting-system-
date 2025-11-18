import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  DollarOutlined,
  BankOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '儀表板',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'accounting',
      icon: <FileTextOutlined />,
      label: '會計管理',
      children: [
        { key: 'accounts', label: '會計科目', onClick: () => navigate('/accounting/accounts') },
        { key: 'journals', label: '會計分錄' },
        { key: 'periods', label: '會計期間' },
      ],
    },
    {
      key: 'sales',
      icon: <ShoppingOutlined />,
      label: '銷售管理',
      children: [
        { key: 'orders', label: '銷售訂單' },
        { key: 'customers', label: '客戶管理' },
      ],
    },
    {
      key: 'ar',
      icon: <DollarOutlined />,
      label: '應收帳款',
      children: [
        { key: 'ar-invoices', label: '應收帳款' },
        { key: 'payments', label: '收款記錄' },
      ],
    },
    {
      key: 'ap',
      icon: <DollarOutlined />,
      label: '應付帳款',
      children: [
        { key: 'ap-invoices', label: '應付帳款' },
        { key: 'expenses', label: '費用申請' },
      ],
    },
    {
      key: 'banking',
      icon: <BankOutlined />,
      label: '銀行管理',
    },
    {
      key: 'payroll',
      icon: <TeamOutlined />,
      label: '薪資管理',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: '報表中心',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系統設定',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <h2 style={{ margin: 0 }}>{collapsed ? 'EC' : '電商會計'}</h2>
        </div>
        <Menu theme="dark" mode="inline" defaultSelectedKeys={['dashboard']} items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>電商會計系統</div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.name || user?.email}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardLayout
