import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Input } from 'antd'
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
  SearchOutlined
} from '@ant-design/icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import CommandPalette from './CommandPalette'
import AICopilotWidget from './AICopilotWidget'
import NotificationCenter from './NotificationCenter'
import SettingsDrawer from './SettingsDrawer'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
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
        { key: '/vendors', label: '供應商管理', onClick: () => navigate('/vendors') },
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
      key: '/reports',
      icon: <FileTextOutlined />,
      label: '報表中心',
      onClick: () => navigate('/reports'),
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: '系統管理',
      children: [
        {
          key: '/admin/access-control',
          label: '帳號與權限',
          onClick: () => navigate('/admin/access-control'),
        },
      ],
    },
  ]

  const resolveMenuLabel = (items: any[], path: string): string | undefined => {
    for (const item of items) {
      if (item?.key === path) {
        return typeof item.label === 'string' ? item.label : undefined
      }
      if (item?.children) {
        const childLabel = resolveMenuLabel(item.children, path)
        if (childLabel) {
          return childLabel
        }
      }
    }
    return undefined
  }

  const currentMenuLabel = resolveMenuLabel(menuItems, location.pathname) ?? '儀表板'

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
      onClick: () => setSettingsOpen(true),
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
      <CommandPalette />
      <AICopilotWidget />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      {/* Floating Orbs Background */}
      <div className="orb fixed w-[600px] h-[600px] rounded-full blur-[100px] -z-10 animate-float" 
           style={{ top: '-10%', left: '-10%', background: '#E0C3FC' }} />
      <div className="orb fixed w-[600px] h-[600px] rounded-full blur-[100px] -z-10 animate-float-delayed" 
           style={{ top: '40%', right: '-10%', background: '#8EC5FC' }} />
      <div className="orb fixed w-[600px] h-[600px] rounded-full blur-[100px] -z-10 animate-float-slow" 
           style={{ bottom: '-10%', left: '20%', background: '#FFDEE9' }} />

      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        width={260}
        className="floating-sidebar"
        style={{
          overflow: 'hidden',
          height: 'calc(100vh - 32px)',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 100,
          background: 'transparent', // Handled by CSS class
        }}
      >
        <div className="h-16 flex items-center justify-center m-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
              <span className="text-xl">💎</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                E-Accounting
              </span>
            )}
          </div>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['accounting', 'sales', 'ar', 'ap', 'admin']}
          items={menuItems}
          className="px-2 bg-transparent border-none"
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 112 : 292, transition: 'all 0.2s', background: 'transparent' }}>
        <Header className="sticky top-0 z-50 flex justify-between items-center px-8 my-4 mx-6 rounded-2xl glass-panel" style={{ height: '64px', padding: '0 24px' }}>
          <div className="flex items-center gap-8">
            <Title level={4} style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
              {currentMenuLabel}
            </Title>
            <div className="hidden md:block">
              <Input 
                prefix={<SearchOutlined style={{ color: 'var(--text-primary)', opacity: 0.5 }} />} 
                placeholder="搜尋..." 
                className="glass-input !rounded-full !w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <NotificationCenter />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Space className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 p-2 rounded-xl transition-colors">
                <Avatar icon={<UserOutlined />} src={user?.avatar} className="bg-gradient-to-br from-blue-500 to-purple-600" />
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name || user?.email}</span>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '0 24px 24px', padding: 0, minHeight: 280 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
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
