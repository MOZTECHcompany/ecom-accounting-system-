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
  LogoutOutlined
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
    { id: 'dashboard', name: 'Dashboard', icon: <DashboardOutlined />, path: '/dashboard' },
    { id: 'sales', name: 'Sales Orders', icon: <ShoppingOutlined />, path: '/sales/orders' },
    { id: 'customers', name: 'Customers', icon: <UserOutlined />, path: '/sales/customers' },
    { id: 'accounting', name: 'Chart of Accounts', icon: <FileTextOutlined />, path: '/accounting/accounts' },
    { id: 'settings', name: 'Settings', icon: <SettingOutlined />, path: '/settings' },
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
            <Command className="w-full bg-[var(--glass-bg)] backdrop-blur-[40px] border border-[var(--glass-border)] shadow-2xl rounded-2xl overflow-hidden">
              <div className="flex items-center border-b border-white/10 px-4">
                <SearchOutlined className="text-gray-400 text-lg mr-3" />
                <Command.Input 
                  placeholder="Type a command or search..." 
                  className="w-full h-14 bg-transparent outline-none text-lg text-[var(--text-primary)] placeholder:text-gray-500 font-light"
                />
                <div className="flex gap-2">
                  <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-medium text-gray-400">
                    <span className="text-xs">ESC</span>
                  </kbd>
                </div>
              </div>

              <Command.List className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                <Command.Empty className="py-12 text-center text-sm text-gray-500">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation" className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 px-2 py-2 mb-1">
                  {pages.map((page) => (
                    <Command.Item
                      key={page.id}
                      onSelect={() => runCommand(() => navigate(page.path))}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--text-primary)] cursor-pointer transition-all aria-selected:bg-white/10 aria-selected:backdrop-blur-md group data-[selected=true]:bg-white/10"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-aria-selected:bg-blue-500 group-aria-selected:text-white group-aria-selected:border-blue-400 transition-all shadow-sm">
                        {page.icon}
                      </div>
                      <span className="flex-1 font-medium">{page.name}</span>
                      <div className="flex items-center gap-2 opacity-0 group-aria-selected:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-400">Jump to</span>
                        <kbd className="h-5 w-5 flex items-center justify-center rounded bg-white/10 text-[10px] text-gray-300">↵</kbd>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions" className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 px-2 py-2 mt-2 mb-1">
                  <Command.Item
                    onSelect={() => runCommand(() => console.log('Create Invoice'))}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--text-primary)] cursor-pointer transition-all aria-selected:bg-white/10 aria-selected:backdrop-blur-md group data-[selected=true]:bg-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-aria-selected:bg-green-500 group-aria-selected:text-white group-aria-selected:border-green-400 transition-all shadow-sm">
                      <FileTextOutlined />
                    </div>
                    <span className="flex-1 font-medium">Create New Invoice</span>
                    <div className="flex items-center gap-2 opacity-0 group-aria-selected:opacity-100 transition-opacity">
                        <kbd className="h-5 px-1.5 flex items-center justify-center rounded bg-white/10 text-[10px] text-gray-300">C</kbd>
                    </div>
                  </Command.Item>
                  
                  <Command.Item
                    onSelect={() => runCommand(() => console.log('Export Report'))}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--text-primary)] cursor-pointer transition-all aria-selected:bg-white/10 aria-selected:backdrop-blur-md group data-[selected=true]:bg-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-aria-selected:bg-purple-500 group-aria-selected:text-white group-aria-selected:border-purple-400 transition-all shadow-sm">
                      <ShoppingOutlined />
                    </div>
                    <span className="flex-1 font-medium">Export Monthly Report</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="System" className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 px-2 py-2 mt-2 mb-1">
                  <Command.Item
                    onSelect={() => runCommand(() => console.log('Toggle Theme'))}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--text-primary)] cursor-pointer transition-all aria-selected:bg-white/10 aria-selected:backdrop-blur-md group data-[selected=true]:bg-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-aria-selected:bg-gray-500 group-aria-selected:text-white group-aria-selected:border-gray-400 transition-all shadow-sm">
                      <SettingOutlined />
                    </div>
                    <span className="flex-1 font-medium">Toggle Dark/Light Mode</span>
                  </Command.Item>
                  
                  <Command.Item
                    onSelect={() => runCommand(() => console.log('Logout'))}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--text-primary)] cursor-pointer transition-all aria-selected:bg-white/10 aria-selected:backdrop-blur-md group data-[selected=true]:bg-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-aria-selected:bg-red-500 group-aria-selected:text-white group-aria-selected:border-red-400 transition-all shadow-sm">
                      <LogoutOutlined />
                    </div>
                    <span className="flex-1 font-medium">Log Out</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
              
              <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between bg-white/5 backdrop-blur-md">
                <div className="flex gap-4 text-[10px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                        <kbd className="h-4 w-4 flex items-center justify-center rounded bg-white/10 text-gray-400">↑</kbd>
                        <kbd className="h-4 w-4 flex items-center justify-center rounded bg-white/10 text-gray-400">↓</kbd>
                        to navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="h-4 w-6 flex items-center justify-center rounded bg-white/10 text-gray-400">↵</kbd>
                        to select
                    </span>
                </div>
                <div className="text-[10px] text-gray-600 font-medium">
                    Pro Tip: Type <span className="text-blue-400">#</span> to search orders
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default CommandPalette