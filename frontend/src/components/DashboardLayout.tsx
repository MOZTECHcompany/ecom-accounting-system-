import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Input, Drawer, Button, Grid } from 'antd'
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
  SearchOutlined,
  MenuOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  BoxPlotOutlined,
  ShopOutlined,
  ToolOutlined
} from '@ant-design/icons'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassDrawer } from './ui/GlassDrawer'
import { useAuth } from '../contexts/AuthContext'
import CommandPalette from './CommandPalette'
import AICopilotWidget from './AICopilotWidget'
import NotificationCenter from './NotificationCenter'
import SettingsDrawer from './SettingsDrawer'

const { Header, Sider, Content } = Layout
const { Title } = Typography
const { useBreakpoint } = Grid

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const screens = useBreakpoint()

  // Determine if we are on a mobile screen (xs or sm, but not md or larger)
  // Note: screens.md is true for >= 768px. So !screens.md means < 768px.
  const isMobile = !screens.md

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
        { key: '/sales/customers', label: '客戶管理', onClick: () => navigate('/sales/customers') },
      ],
    },
    {
      key: 'inventory',
      icon: <BoxPlotOutlined />,
      label: '庫存管理',
      children: [
        { key: '/inventory/products', label: '產品與庫存', onClick: () => navigate('/inventory/products') },
      ],
    },
    {
      key: 'purchasing',
      icon: <ShopOutlined />,
      label: '採購管理',
      children: [
        { key: '/purchasing/orders', label: '採購訂單', onClick: () => navigate('/purchasing/orders') },
        { key: '/vendors', label: '供應商管理', onClick: () => navigate('/vendors') },
      ],
    },
    {
      key: 'manufacturing',
      icon: <ToolOutlined />,
      label: '製造管理',
      children: [
        { key: '/manufacturing/assembly', label: '組裝工單', onClick: () => navigate('/manufacturing/assembly') },
      ],
    },
    {
      key: 'ar',
      icon: <DollarOutlined />,
      label: '應收帳款',
      children: [
        { key: '/ar/invoices', label: '應收帳款', onClick: () => navigate('/sales/invoices') },
        { key: '/ar/payments', label: '收款記錄' },
      ],
    },
    {
      key: 'ap',
      icon: <DollarOutlined />,
      label: '應付帳款',
      children: [
        { key: '/vendors', label: '供應商管理', onClick: () => navigate('/vendors') },
        { key: '/ap/payable', label: '費用付款', onClick: () => navigate('/ap/payable') },
        { key: '/ap/expenses', label: '費用申請', onClick: () => navigate('/ap/expenses') },
        { key: '/ap/expense-review', label: '費用審核中心', onClick: () => navigate('/ap/expense-review') },
      ],
    },
    {
      key: 'banking',
      icon: <BankOutlined />,
      label: '銀行管理',
      onClick: () => navigate('/banking'),
    },
    {
      key: 'attendance',
      icon: <ClockCircleOutlined />,
      label: '考勤管理',
      children: [
        { key: '/attendance/dashboard', label: '打卡儀表板', onClick: () => navigate('/attendance/dashboard') },
        { key: '/attendance/leaves', label: '請假申請', onClick: () => navigate('/attendance/leaves') },
        { key: '/attendance/admin', label: '考勤管理後台', onClick: () => navigate('/attendance/admin') },
      ],
    },
    {
      key: 'payroll',
      icon: <TeamOutlined />,
      label: '薪資管理',
      children: [
        { key: '/payroll/runs', label: '薪資計算', onClick: () => navigate('/payroll/runs') },
        { key: '/payroll/employees', label: '員工與部門', onClick: () => navigate('/payroll/employees') },
      ],
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
        {
          key: '/admin/reimbursement-items',
          label: '報銷項目管理',
          onClick: () => navigate('/admin/reimbursement-items'),
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
      onClick: () => navigate('/profile'),
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

      {!isMobile ? (
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          width={260}
          trigger={null}
          className="floating-sidebar"
          style={{
            height: 'calc(100vh - 32px)',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 100,
            background: 'transparent', // Handled by CSS class
            overflow: 'hidden',
          }}
        >
          <div className="flex flex-col h-full">
            <div className="shrink-0 h-16 flex items-center justify-center m-4 mb-8">
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[location.pathname]}
                defaultOpenKeys={['accounting', 'sales', 'ar', 'ap', 'admin']}
                items={menuItems}
                className="px-2 bg-transparent border-none"
              />
            </div>
            <div 
              className="shrink-0 h-12 flex items-center justify-center cursor-pointer transition-colors hover:bg-black/5"
              style={{ 
                borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                color: 'var(--text-primary)'
              }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <RightOutlined /> : <LeftOutlined />}
            </div>
          </div>
        </Sider>
      ) : (
        <GlassDrawer
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
        >
          <div className="h-16 flex items-center justify-center m-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
                <span className="text-xl">💎</span>
              </div>
              <span className="text-lg font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                E-Accounting
              </span>
            </div>
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['accounting', 'sales', 'ar', 'ap', 'admin']}
            items={menuItems}
            className="px-2 bg-transparent border-none"
            onClick={() => setMobileMenuOpen(false)}
          />
        </GlassDrawer>
      )}

      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 112 : 292), 
        transition: 'all 0.2s', 
        background: 'transparent' 
      }}>
        <Header className="sticky top-0 z-50 flex justify-between items-center px-4 md:px-8 my-2 md:my-4 mx-2 md:mx-6 rounded-2xl glass-panel" style={{ height: '64px', padding: isMobile ? '0 16px' : '0 24px' }}>
          <div className="flex items-center gap-4 md:gap-8">
            {isMobile && (
              <Button 
                type="text" 
                icon={<MenuOutlined />} 
                onClick={() => setMobileMenuOpen(true)}
                style={{ fontSize: '18px', width: 40, height: 40 }}
              />
            )}
            <Title level={4} style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)', fontSize: isMobile ? '1.1rem' : undefined }}>
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
          <div className="flex items-center gap-3 md:gap-6">
            <NotificationCenter />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Space className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 p-2 rounded-xl transition-colors">
                <Avatar icon={<UserOutlined />} src={user?.avatar} className="bg-gradient-to-br from-blue-500 to-purple-600" />
                {!isMobile && <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name || user?.email}</span>}
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: isMobile ? '0 8px 16px' : '0 24px 24px', padding: 0, minHeight: 280 }}>
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
