import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Input, Badge } from 'antd'
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
  BellOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '儀表板',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'accounting',
      icon: <FileTextOutlined />,
      label: '會計管理',
      children: [
        { key: '/accounting/accounts', label: '會計科目', onClick: () => navigate('/accounting/accounts') },
        { key: '/accounting/journals', label: '會計分錄' },
        { key: '/accounting/periods', label: '會計期間' },
      ],
    },
    {
      key: 'sales',
      icon: <ShoppingOutlined />,
      label: '銷售管理',
      children: [
        { key: '/sales/orders', label: '銷售訂單', onClick: () => navigate('/sales/orders') },
        { key: '/sales/customers', label: '客戶管理' },
      ],
    },
    {
      key: 'ar',
      icon: <DollarOutlined />,
      label: '應收帳款',
      children: [
        { key: '/ar/invoices', label: '應收帳款' },
        { key: '/ar/payments', label: '收款記錄' },
      ],
    },
    {
      key: 'ap',
      icon: <DollarOutlined />,
      label: '應付帳款',
      children: [
        { key: '/ap/invoices', label: '應付帳款' },
        { key: '/ap/expenses', label: '費用申請' },
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
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        width={260}
        className="glass-sider"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div className="h-16 flex items-center justify-center m-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-blue-400/30">
              <span className="text-xl">💎</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-white tracking-wide">
                E-Accounting
              </span>
            )}
          </div>
        </div>
        <Menu 
          theme="light" 
          mode="inline" 
          defaultSelectedKeys={[location.pathname]} 
          defaultOpenKeys={['accounting', 'sales', 'ar', 'ap']}
          items={menuItems} 
          className="px-2"
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s' }}>
        <Header className="glass-header sticky top-0 z-50 flex justify-between items-center px-8">
          <div className="flex items-center gap-8">
            <Title level={4} style={{ margin: 0, fontWeight: 400 }}>
              {menuItems.find(i => i.key === location.pathname)?.label || '儀表板'}
            </Title>
            <div className="hidden md:block">
              <Input 
                prefix={<SearchOutlined className="text-white/50" />} 
                placeholder="搜尋..." 
                className="!bg-white/10 !border-white/10 !text-white !rounded-full !w-64 hover:!bg-white/20 focus:!bg-white/20 placeholder:!text-white/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors relative">
              <Badge dot offset={[-6, 6]} color="red">
                <BellOutlined className="text-lg text-white/70" />
              </Badge>
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Space className="cursor-pointer hover:bg-white/10 p-2 rounded-xl transition-colors">
                <Avatar icon={<UserOutlined />} src={user?.avatar} className="bg-blue-500" />
                <span className="text-white/90 font-medium">{user?.name || user?.email}</span>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 24px', padding: 0, minHeight: 280 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardLayout
