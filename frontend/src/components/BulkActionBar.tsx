import React from 'react'
import { Button, Space, Tooltip, Badge } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'

export interface BulkAction {
  label: string
  onClick: () => void
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  icon?: React.ReactNode
  danger?: boolean
}

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: BulkAction[]
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ 
  selectedCount, 
  onClear, 
  actions
}) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-white/10">
            <div className="flex items-center gap-3 border-r border-white/20 pr-6">
              <Badge count={selectedCount} style={{ backgroundColor: '#1890ff' }} />
              <span className="font-medium">已選擇 {selectedCount} 筆訂單</span>
              <Button type="link" size="small" onClick={onClear} className="text-gray-400 hover:text-white !p-0">
                取消
              </Button>
            </div>
            
            <Space size="large">
              {actions.map((action, index) => (
                <Tooltip key={index} title={action.label}>
                  <Button 
                    type={action.type === 'primary' ? 'primary' : 'text'}
                    danger={action.danger}
                    icon={action.icon}
                    className={action.type === 'primary' ? '' : "text-white hover:bg-white/10"}
                    onClick={action.onClick}
                  >
                    {action.type === 'primary' ? action.label : null}
                  </Button>
                </Tooltip>
              ))}
            </Space>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default BulkActionBar
