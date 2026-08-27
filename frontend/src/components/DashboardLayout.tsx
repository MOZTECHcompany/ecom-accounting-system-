import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Input,
  Button,
  Grid,
} from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  SearchOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { AnimatePresence, motion } from 'framer-motion'
import { GlassDrawer } from './ui/GlassDrawer'
import { useAuth } from '../contexts/AuthContext'
import BrandMark from './BrandMark'
import CommandPalette from './CommandPalette'
import NotificationCenter from './NotificationCenter'
import SettingsDrawer from './SettingsDrawer'
import { hasAnyPermission, hasPermission, isAdminUser } from '../utils/access'

const { Header, Sider, Content } = Layout
const { Title } = Typography
const { useBreakpoint } = Grid

type ErpMenuItem = {
  key: string
  icon?: React.ReactNode
  label: string
  hidden?: boolean
  onClick?: () => void
  children?: ErpMenuItem[]
}

const DashboardLayout: React.FC = () => {
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const screens = useBreakpoint()

  // Determine if we are on a mobile screen (xs or sm, but not md or larger)
  // Note: screens.md is true for >= 768px. So !screens.md means < 768px.
  const isMobile = !screens.md
  const isCompactDesktop = Boolean(screens.md && !screens.lg)
  const desktopSidebarCollapsed = sidebarCollapsed || isCompactDesktop
  const canAccess = (permissions: string[] = []) =>
    permissions.length === 0 || hasAnyPermission(user, permissions)
  const searchValue = searchParams.get('q') ?? ''

  const handleGlobalSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (nextValue.trim()) {
          next.set('q', nextValue)
        } else {
          next.delete('q')
        }
        return next
      },
      { replace: true },
    )
  }

  const menuItems: ErpMenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '儀表板',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: 'operations',
      icon: <ShoppingOutlined />,
      label: '營運管理',
      children: [
        {
          key: '/sales/orders',
          label: '銷售訂單',
          hidden: !canAccess(['sales_orders:read']),
          onClick: () => navigate('/sales/orders'),
        },
        {
          key: '/sales/quotations',
          label: '客戶報價單',
          hidden: !canAccess(['sales_orders:read', 'purchase_orders:read']),
          onClick: () => navigate('/sales/quotations'),
        },
        {
          key: '/sales/after-sales',
          label: '來回件',
          hidden: !canAccess(['after_sales_cases:read', 'sales_orders:read']),
          onClick: () => navigate('/sales/after-sales'),
        },
        {
          key: '/sales/customers',
          label: '客戶管理',
          hidden: !canAccess(['sales_orders:read']),
          onClick: () => navigate('/sales/customers'),
        },
        {
          key: '/purchasing/orders',
          label: '採購訂單',
          hidden: !canAccess(['purchase_orders:read']),
          onClick: () => navigate('/purchasing/orders'),
        },
        {
          key: '/vendors',
          label: '供應商管理',
          hidden: !canAccess(['purchase_orders:read', 'accounts:read']),
          onClick: () => navigate('/vendors'),
        },
        {
          key: '/inventory/products',
          label: '產品與庫存',
          hidden: !canAccess(['inventory:read']),
          onClick: () => navigate('/inventory/products'),
        },
        {
          key: '/manufacturing/assembly',
          label: '組裝工單',
          hidden: !canAccess(['inventory:read']),
          onClick: () => navigate('/manufacturing/assembly'),
        },
      ],
    },
    {
      key: 'finance-accounting',
      icon: <FileTextOutlined />,
      label: '財務會計',
      children: [
        {
          key: '/accounting/workbench',
          label: '會計工作台',
          hidden: !canAccess(['accounts:read', 'journal_entries:read']),
          onClick: () => navigate('/accounting/workbench'),
        },
        {
          key: '/accounting/workbench?focus=missing-invoices',
          label: '缺發票處理',
          hidden: !canAccess(['accounts:read', 'journal_entries:read']),
          onClick: () =>
            navigate('/accounting/workbench?focus=missing-invoices'),
        },
        {
          key: '/accounting/accounts',
          label: '會計科目',
          hidden: !canAccess(['accounts:read']),
          onClick: () => navigate('/accounting/accounts'),
        },
        {
          key: '/accounting/journals',
          label: '會計分錄',
          hidden: !canAccess(['journal_entries:read']),
          onClick: () => navigate('/accounting/journals'),
        },
        {
          key: '/accounting/periods',
          label: '會計期間',
          hidden: !canAccess(['accounts:read']),
          onClick: () => navigate('/accounting/periods'),
        },
        {
          key: '/sales/invoices',
          label: '應收帳款',
          hidden: !canAccess(['sales_orders:read', 'accounts:read']),
          onClick: () => navigate('/sales/invoices'),
        },
        {
          key: '/ap/payable',
          label: '費用付款',
          hidden: !canAccess(['purchase_orders:read', 'accounts:read']),
          onClick: () => navigate('/ap/payable'),
        },
        {
          key: '/ap/expenses',
          label: '費用申請',
          hidden: !canAccess(['purchase_orders:read', 'accounts:read']),
          onClick: () => navigate('/ap/expenses'),
        },
        {
          key: '/ap/expense-review',
          label: '費用審核中心',
          hidden: !canAccess(['purchase_orders:read', 'accounts:read']),
          onClick: () => navigate('/ap/expense-review'),
        },
        {
          key: '/banking',
          label: '銀行管理',
          hidden: !canAccess(['banking:read']),
          onClick: () => navigate('/banking'),
        },
        {
          key: '/reconciliation',
          label: '對帳中心',
          hidden: !canAccess(['banking:read', 'reports:read', 'accounts:read']),
          onClick: () => navigate('/reconciliation'),
        },
        {
          key: '/reconciliation/timeout',
          label: '超時對帳',
          hidden: !canAccess(['reconciliation_timeout:read', 'accounts:read', 'journal_entries:read']),
          onClick: () => navigate('/reconciliation/timeout'),
        },
        {
          key: '/reports',
          label: '報表中心',
          hidden: !canAccess(['reports:read']),
          onClick: () => navigate('/reports'),
        },
      ],
    },
    {
      key: 'hr-attendance',
      icon: <ClockCircleOutlined />,
      label: '人資與考勤',
      children: [
        {
          key: '/attendance/dashboard',
          label: '打卡儀表板',
          hidden: !canAccess(['attendance_self:read']),
          onClick: () => navigate('/attendance/dashboard'),
        },
        {
          key: '/attendance/leaves',
          label: '請假申請',
          hidden: !canAccess(['leave_self:read']),
          onClick: () => navigate('/attendance/leaves'),
        },
        {
          key: '/payroll/employees',
          label: '員工與部門',
          hidden: !canAccess(['employees_admin:read']),
          onClick: () => navigate('/payroll/employees'),
        },
        {
          key: '/attendance/admin',
          label: '總覽與審核',
          hidden: !canAccess(['attendance_admin:read']),
          onClick: () => navigate('/attendance/admin'),
        },
        {
          key: '/payroll/runs',
          label: '薪資計算',
          hidden: !canAccess(['payroll_self:read', 'payroll_admin:read']),
          onClick: () => navigate('/payroll/runs'),
        },
      ],
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: '系統管理',
      hidden: !(
        isAdminUser(user) ||
        hasPermission(user, 'access_control:read') ||
        hasPermission(user, 'access_control:update')
      ),
      children: [
        {
          key: '/admin/access-control',
          label: '帳號與權限',
          onClick: () => navigate('/admin/access-control'),
        },
        {
          key: '/admin/entities',
          label: '事業代號管理',
          hidden: !(user?.roles ?? []).includes('SUPER_ADMIN'),
          onClick: () => navigate('/admin/entities'),
        },
        {
          key: '/admin/reimbursement-items',
          label: '報銷項目管理',
          onClick: () => navigate('/admin/reimbursement-items'),
        },
        {
          key: '/admin/settings',
          label: '系統設定',
          onClick: () => navigate('/admin/settings'),
        },
      ],
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '個人資料',
      hidden: !canAccess(['profile_self:read']),
      onClick: () => navigate('/profile'),
    },
  ]

  const filterMenuItems = (items: ErpMenuItem[]): ErpMenuItem[] =>
    items
      .filter((item) => !item.hidden)
      .map((item) => {
        if (!item.children) {
          return item
        }
        const children = filterMenuItems(item.children)
        if (children.length === 0) {
          return null
        }
        return {
          ...item,
          children,
        }
      })
      .filter((item): item is ErpMenuItem => item !== null)

  const visibleMenuItems = filterMenuItems(menuItems)
  const resolveParentMenuKey = (items: ErpMenuItem[], path: string): string | null => {
    for (const item of items) {
      if (item.children?.some((child) => child.key.split('?')[0] === path)) {
        return String(item.key)
      }
    }
    return null
  }
  const routeParentMenuKey = resolveParentMenuKey(visibleMenuItems, location.pathname)
  const effectiveOpenMenuKeys = routeParentMenuKey && !openMenuKeys.includes(routeParentMenuKey)
    ? [...openMenuKeys, routeParentMenuKey]
    : openMenuKeys

  const resolveMenuLabel = (items: ErpMenuItem[], path: string): string | undefined => {
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

  const currentMenuLabel =
    resolveMenuLabel(visibleMenuItems, location.pathname) ?? '儀表板'

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
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Floating Orbs Background */}
      <div
        className="orb fixed w-[600px] h-[600px] rounded-full blur-[100px] -z-10 animate-float"
        style={{ top: '-10%', left: '-10%', background: '#E0C3FC' }}
      />
      <div
        className="orb fixed w-[600px] h-[600px] rounded-full blur-[100px] -z-10 animate-float-delayed"
        style={{ top: '40%', right: '-10%', background: '#8EC5FC' }}
      />
      <div
        className="orb fixed w-[600px] h-[600px] rounded-full blur-[100px] -z-10 animate-float-slow"
        style={{ bottom: '-10%', left: '20%', background: '#FFDEE9' }}
      />

      {!isMobile && (
        <Sider
          width={260}
          collapsedWidth={80}
          collapsed={desktopSidebarCollapsed}
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
            <div className={`shrink-0 h-16 flex items-center justify-center m-4 ${desktopSidebarCollapsed ? 'mb-4' : 'mb-8'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
                  <BrandMark className="w-7 h-7" alt="System logo" />
                </div>
                {!desktopSidebarCollapsed && (
                  <div
                    className="max-w-[160px] text-sm font-semibold leading-tight tracking-wide"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    電子商務 ERP
                  </div>
                )}
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[location.pathname]}
                openKeys={effectiveOpenMenuKeys}
                onOpenChange={(keys) => setOpenMenuKeys(keys.map(String))}
                items={visibleMenuItems}
                inlineCollapsed={desktopSidebarCollapsed}
                className="px-2 bg-transparent border-none"
              />
            </div>
            <Button
              type="text"
              className="!mx-2 !mb-2 !flex !w-auto shrink-0 items-center justify-center"
              icon={desktopSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={desktopSidebarCollapsed ? '展開側欄' : '收合側欄'}
              title={desktopSidebarCollapsed ? '展開側欄' : '收合側欄'}
              onClick={() => {
                if (isCompactDesktop) {
                  setMobileMenuOpen(true)
                  return
                }
                setSidebarCollapsed((current) => !current)
              }}
            >
              {!desktopSidebarCollapsed && '收合側欄'}
            </Button>
          </div>
        </Sider>
      )}

      {(isMobile || isCompactDesktop) && (
        <GlassDrawer
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
        >
          <div className="h-16 flex items-center justify-center m-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
                <BrandMark className="w-7 h-7" alt="System logo" />
              </div>
              <div
                className="max-w-[180px] text-sm font-semibold leading-tight tracking-wide"
                style={{ color: 'var(--text-primary)' }}
              >
                電子商務 ERP
              </div>
            </div>
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            openKeys={effectiveOpenMenuKeys}
            onOpenChange={(keys) => setOpenMenuKeys(keys.map(String))}
            items={visibleMenuItems}
            className="px-2 bg-transparent border-none"
            onClick={() => setMobileMenuOpen(false)}
          />
        </GlassDrawer>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : desktopSidebarCollapsed ? 112 : 292,
          transition: 'all 0.2s',
          background: 'transparent',
        }}
      >
        <Header
          className="sticky top-0 z-50 flex justify-between items-center px-4 md:px-8 my-2 md:my-4 mx-2 md:mx-6 rounded-2xl glass-panel"
          style={{ height: '64px', padding: isMobile ? '0 16px' : '0 24px' }}
        >
          <div className="flex items-center gap-4 md:gap-8">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ fontSize: '18px', width: 40, height: 40 }}
              />
            )}
            <Title
              level={4}
              style={{
                margin: 0,
                fontWeight: 500,
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.1rem' : undefined,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {currentMenuLabel}
            </Title>
            <div className="hidden lg:block">
              <Input
                prefix={
                  <SearchOutlined
                    style={{ color: 'var(--text-primary)', opacity: 0.5 }}
                  />
                }
                placeholder="搜尋..."
                className="glass-input !rounded-full !w-64"
                value={searchValue}
                onChange={handleGlobalSearchChange}
                allowClear
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <NotificationCenter />
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 p-2 rounded-xl transition-colors">
                <Avatar
                  icon={<UserOutlined />}
                  src={user?.avatar}
                  className="bg-gradient-to-br from-blue-500 to-purple-600"
                />
                {screens.lg && (
                  <span
                    className="font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user?.name || user?.email}
                  </span>
                )}
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? '0 8px 16px' : '0 24px 24px',
            padding: 0,
            minHeight: 280,
          }}
        >
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
