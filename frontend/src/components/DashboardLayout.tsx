import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Input, Badge, Button } from 'antd'
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
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

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
        { key: '/sales/orders', label: '銷售訂單' },
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
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出系統',
      danger: true,
      onClick: logout,
    },
  ]

  return (
    <Layout className="min-h-screen bg-transparent">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        className="!bg-transparent relative z-20"
        theme="dark"
      >
        <div className="h-full flex flex-col">
          <div className="h-20 flex items-center justify-center px-6 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl">💎</span>
            </div>
            {!collapsed && (
              <div className="ml-3 animate-fade-in">
                <Title level={5} className="!text-white !m-0 font-medium tracking-wide">Ecom System</Title>
                <Text className="!text-white/40 text-xs">Accounting Pro</Text>
              </div>
            )}
          </div>

          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={[location.pathname]}
            items={menuItems}
            className="flex-1 px-3 overflow-y-auto custom-scrollbar"
          />

          <div className="p-4 mt-auto">
            <div className={`glass-panel rounded-xl p-4 transition-all duration-300 ${collapsed ? 'items-center justify-center' : ''} flex`}>
              <Avatar size="large" src={`https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=3b82f6&color=fff`} />
              {!collapsed && (
                <div className="ml-3 overflow-hidden">
                  <Text className="!text-white block font-medium truncate">{user?.name || 'Admin User'}</Text>
                  <Text className="!text-white/40 text-xs block truncate">{user?.email || 'admin@example.com'}</Text>
                </div>
              )}
            </div>
          </div>
        </div>
      </Sider>
      
      <Layout className="!bg-transparent relative z-10">
        <Header className="flex items-center justify-between sticky top-4 z-30 transition-all duration-300">
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="!text-white/70 hover:!text-white hover:!bg-white/10 !w-10 !h-10 !rounded-xl mr-4"
            />
            <div className="hidden md:block w-64">
              <Input 
                prefix={<SearchOutlined className="text-white/30" />} 
                placeholder="搜尋功能、報表或資料..." 
                className="!bg-white/5 !border-white/10 !text-white hover:!border-white/20 focus:!border-blue-500/50 !rounded-xl"
                bordered={false}
              />
            </div>
          </div>

          <Space size="large">
            <Badge count={5} dot offset={[-2, 2]} color="blue">
              <Button 
                type="text" 
                icon={<BellOutlined />} 
                className="!text-white/70 hover:!text-white hover:!bg-white/10 !w-10 !h-10 !rounded-xl"
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center cursor-pointer hover:bg-white/5 px-2 py-1 rounded-xl transition-colors">
                <Avatar 
                  size="small" 
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                  icon={<UserOutlined />} 
                />
                <SettingOutlined className="text-white/50 ml-2" />
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content className="p-8 overflow-y-auto h-[calc(100vh-32px)] custom-scrollbar">
          <div className="animate-fade-in-up max-w-7xl mx-auto">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardLayout
