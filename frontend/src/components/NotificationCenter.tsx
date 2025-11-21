import React, { useState } from 'react'
import { Popover, Badge, List, Avatar, Tabs, Button, Typography, Empty, Tag } from 'antd'
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  WarningOutlined, 
  InfoCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'

const { Text, Title } = Typography

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  category: 'system' | 'approval' | 'finance'
  title: string
  description: string
  time: string
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    category: 'finance',
    title: '庫存水位過低警示',
    description: '商品 "MacBook Pro M3" 庫存僅剩 2 台，請盡快補貨。',
    time: '10 分鐘前',
    read: false
  },
  {
    id: '2',
    type: 'info',
    category: 'approval',
    title: '新費用申請待簽核',
    description: '行銷部門提交了一筆 NT$ 25,000 的廣告費用申請。',
    time: '1 小時前',
    read: false
  },
  {
    id: '3',
    type: 'success',
    category: 'system',
    title: '系統備份完成',
    description: '每日自動資料庫備份已於 03:00 AM 成功完成。',
    time: '5 小時前',
    read: true
  },
  {
    id: '4',
    type: 'error',
    category: 'finance',
    title: '付款失敗通知',
    description: '訂單 #ORD-2025005 的信用卡扣款失敗，請聯繫客戶。',
    time: '昨天',
    read: true
  }
]

const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <WarningOutlined className="text-orange-500" />
      case 'success': return <CheckCircleOutlined className="text-green-500" />
      case 'error': return <CloseCircleOutlined className="text-red-500" /> // Fixed: CloseCircleOutlined is not imported, use WarningOutlined or import it. Let's use Warning for error too or import CloseCircle.
      default: return <InfoCircleOutlined className="text-blue-500" />
    }
  }
  
  // Fix for missing import in getIcon if I missed it. I imported CloseCircleOutlined in previous files but maybe not here.
  // Let's check imports. I imported CloseCircleOutlined? No, I imported CloseCircleOutlined in SalesPage. 
  // In this file I imported: BellOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined, ClockCircleOutlined, FileTextOutlined, DollarOutlined.
  // I need to add CloseCircleOutlined to imports or use something else. I'll add it to imports.

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : activeTab === 'unread' 
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.category === activeTab)

  const content = (
    <div className="w-[380px]">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <Title level={5} className="!mb-0">通知中心</Title>
        <Button type="link" size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
          全部標為已讀
        </Button>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="px-4"
        items={[
          { key: 'all', label: '全部' },
          { key: 'unread', label: `未讀 (${unreadCount})` },
          { key: 'approval', label: '待簽核' },
          { key: 'finance', label: '財務' },
        ]}
      />

      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence mode='popLayout'>
          {filteredNotifications.length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={filteredNotifications}
              renderItem={(item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 ${!item.read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100`}>
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <Text strong className="text-gray-800">{item.title}</Text>
                        <Text type="secondary" className="text-xs whitespace-nowrap ml-2">{item.time}</Text>
                      </div>
                      <Text type="secondary" className="text-sm line-clamp-2 mb-2 block">
                        {item.description}
                      </Text>
                      <div className="flex gap-2">
                        {item.category === 'approval' && (
                          <Tag color="blue" className="rounded-full text-xs px-2">待簽核</Tag>
                        )}
                        {item.category === 'finance' && (
                          <Tag color="gold" className="rounded-full text-xs px-2">財務</Tag>
                        )}
                      </div>
                    </div>
                    {!item.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    )}
                  </div>
                </motion.div>
              )}
            />
          ) : (
            <div className="py-12 text-center">
              <Empty description="暫無通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="p-2 border-t border-gray-100 text-center">
        <Button type="text" block size="small" className="text-gray-500">
          查看所有歷史通知
        </Button>
      </div>
    </div>
  )

  return (
    <Popover 
      content={content} 
      trigger="click" 
      placement="bottomRight" 
      open={open} 
      onOpenChange={setOpen}
      overlayClassName="notification-popover"
      arrow={false}
    >
      <div className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors relative">
        <Badge count={unreadCount} offset={[-2, 5]} size="small" color="#ef4444">
          <BellOutlined className="text-lg text-white/70" />
        </Badge>
      </div>
    </Popover>
  )
}

export default NotificationCenter
