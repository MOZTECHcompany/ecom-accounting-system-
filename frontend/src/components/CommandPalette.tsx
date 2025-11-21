import React, { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { 
  SearchOutlined, 
  DashboardOutlined, 
  FileTextOutlined, 
  ShoppingOutlined, 
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  RightOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const pages = [
    { id: 'dashboard', name: '儀表板', icon: <DashboardOutlined />, path: '/dashboard' },
    { id: 'sales', name: '銷售訂單', icon: <ShoppingOutlined />, path: '/sales/orders' },
    { id: 'customers', name: '客戶管理', icon: <UserOutlined />, path: '/sales/customers' },
    { id: 'accounting', name: '會計科目', icon: <FileTextOutlined />, path: '/accounting/accounts' },
    { id: 'settings', name: '系統設定', icon: <SettingOutlined />, path: '/settings' },
  ]

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-2xl relative z-10"
          >
            <Command className="w-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl overflow-hidden">
              <div className="flex items-center border-b border-gray-200/50 px-4">
                <SearchOutlined className="text-gray-400 text-lg mr-3" />
                <Command.Input 
                  placeholder="搜尋頁面、功能或指令..." 
                  className="w-full h-14 bg-transparent outline-none text-lg text-gray-800 placeholder:text-gray-400"
                />
                <div className="flex gap-2">
                  <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 text-[10px] font-medium text-gray-500 opacity-100">
                    <span className="text-xs">ESC</span>
                  </kbd>
                </div>
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                <Command.Empty className="py-6 text-center text-sm text-gray-500">
                  找不到相關結果
                </Command.Empty>

                <Command.Group heading="快速導航" className="text-xs font-medium text-gray-400 px-2 py-1.5 mb-1">
                  {pages.map((page) => (
                    <Command.Item
                      key={page.id}
                      onSelect={() => runCommand(() => navigate(page.path))}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-blue-500/10 hover:text-blue-600 transition-colors aria-selected:bg-blue-500/10 aria-selected:text-blue-600 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        {page.icon}
                      </div>
                      <span className="flex-1 font-medium">{page.name}</span>
                      <RightOutlined className="text-xs opacity-0 group-hover:opacity-50" />
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="系統指令" className="text-xs font-medium text-gray-400 px-2 py-1.5 mt-2 mb-1">
                  <Command.Item
                    onSelect={() => runCommand(() => console.log('Toggle Theme'))}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-blue-500/10 hover:text-blue-600 transition-colors aria-selected:bg-blue-500/10 aria-selected:text-blue-600 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <SettingOutlined />
                    </div>
                    <span className="flex-1 font-medium">切換深色模式 (Coming Soon)</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runCommand(() => navigate('/login'))}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-red-500/10 hover:text-red-600 transition-colors aria-selected:bg-red-500/10 aria-selected:text-red-600 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                      <LogoutOutlined />
                    </div>
                    <span className="flex-1 font-medium">登出系統</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default CommandPalette
