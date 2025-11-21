import React from 'react'
import { Button, Space, Tooltip, Badge } from 'antd'
import { 
  DeleteOutlined, 
  ExportOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  PrinterOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  onExport: () => void
  onDelete: () => void
  onComplete: () => void
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ 
  selectedCount, 
  onClear, 
  onExport, 
  onDelete,
  onComplete
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
              <Tooltip title="批次完成">
                <Button 
                  type="text" 
                  icon={<CheckCircleOutlined className="text-green-400 text-lg" />} 
                  className="text-white hover:bg-white/10"
                  onClick={onComplete}
                />
              </Tooltip>
              
              <Tooltip title="匯出選取項目">
                <Button 
                  type="text" 
                  icon={<ExportOutlined className="text-blue-400 text-lg" />} 
                  className="text-white hover:bg-white/10"
                  onClick={onExport}
                />
              </Tooltip>

              <Tooltip title="列印">
                <Button 
                  type="text" 
                  icon={<PrinterOutlined className="text-gray-300 text-lg" />} 
                  className="text-white hover:bg-white/10"
                />
              </Tooltip>
              
              <div className="w-px h-4 bg-white/20 mx-2" />
              
              <Tooltip title="批次刪除">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined className="text-red-400 text-lg" />} 
                  className="text-white hover:bg-white/10"
                  onClick={onDelete}
                />
              </Tooltip>
            </Space>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default BulkActionBar
