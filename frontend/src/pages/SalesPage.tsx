import React, { useState } from 'react'
import { Table, Tag, Button, Space, Input, DatePicker, Card, Typography, Dropdown, Segmented, message } from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined, 
  MoreOutlined, 
  PrinterOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  BarsOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import OrderDetailsDrawer from '../components/OrderDetailsDrawer'
import SalesAnalytics from '../components/SalesAnalytics'
import BulkActionBar from '../components/BulkActionBar'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface Order {
  key: string
  id: string
  customer: string
  date: string
  amount: number
  status: 'completed' | 'pending' | 'cancelled'
  items: number
  paymentMethod: string
}

const initialData: Order[] = Array.from({ length: 20 }).map((_, i) => ({
  key: i.toString(),
  id: `ORD-${2025001 + i}`,
  customer: ['Tech Solutions Inc.', 'Global Trade Co.', 'Smart Systems Ltd.', 'Future Corp.'][i % 4],
  date: `2025-11-${String((i % 30) + 1).padStart(2, '0')}`,
  amount: Math.floor(Math.random() * 50000) + 1000,
  status: i % 5 === 0 ? 'cancelled' : i % 3 === 0 ? 'pending' : 'completed',
  items: Math.floor(Math.random() * 10) + 1,
  paymentMethod: ['Credit Card', 'Bank Transfer', 'PayPal'][i % 3],
}))

const KanbanColumn: React.FC<{ title: string; status: string; orders: Order[]; color: string; onClick: (order: Order) => void }> = ({ title, status, orders, color, onClick }) => (
  <div className="flex-1 min-w-[300px] glass-panel p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="font-medium text-gray-700">{title}</span>
        <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs text-gray-500">{orders.length}</span>
      </div>
      <Button type="text" icon={<MoreOutlined />} size="small" />
    </div>
    <div className="space-y-3">
      {orders.map(order => (
        <motion.div
          key={order.key}
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onClick(order)}
          className="glass-card p-4 cursor-pointer !bg-white/80 hover:!bg-white/90 dark:!bg-white/10 dark:hover:!bg-white/20"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-blue-600 font-medium text-sm">{order.id}</span>
            <span className="text-xs text-gray-400">{order.date}</span>
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">{order.customer}</div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-500 text-sm">{order.items} items</span>
            <span className="font-mono font-medium dark:text-gray-300">NT$ {order.amount.toLocaleString()}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
)

const SalesPage: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(initialData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sales Orders")
    XLSX.writeFile(wb, "sales_orders_export.xlsx")
    message.success('報表匯出成功')
  }

  const handleRowClick = (record: Order) => {
    setSelectedOrder(record)
    setDrawerOpen(true)
  }

  const handleBulkComplete = () => {
    message.success(`已將 ${selectedRowKeys.length} 筆訂單標記為完成`)
    setSelectedRowKeys([])
  }

  const handleBulkDelete = () => {
    message.success(`已刪除 ${selectedRowKeys.length} 筆訂單`)
    setSelectedRowKeys([])
  }

  const handleBulkExport = () => {
    const selectedData = initialData.filter(item => selectedRowKeys.includes(item.key))
    const ws = XLSX.utils.json_to_sheet(selectedData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Selected Orders")
    XLSX.writeFile(wb, "selected_orders_export.xlsx")
    message.success(`已匯出 ${selectedRowKeys.length} 筆訂單`)
    setSelectedRowKeys([])
  }

  const columns = [
    {
      title: '訂單編號',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span className="font-medium text-blue-600">{text}</span>,
    },
    {
      title: '客戶名稱',
      dataIndex: 'customer',
      key: 'customer',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: '訂單日期',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Order, b: Order) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-mono">
          NT$ {amount.toLocaleString()}
        </span>
      ),
      sorter: (a: Order, b: Order) => a.amount - b.amount,
    },
    {
      title: '付款方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default'
        let icon = <ClockCircleOutlined />
        let text = '處理中'

        if (status === 'completed') {
          color = 'success'
          icon = <CheckCircleOutlined />
          text = '已完成'
        } else if (status === 'cancelled') {
          color = 'error'
          icon = <CloseCircleOutlined />
          text = '已取消'
        }

        return (
          <Tag icon={icon} color={color} className="px-3 py-1 rounded-full border-0">
            {text}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Order) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="text" icon={<PrinterOutlined />} />
          <Dropdown menu={{ items: [{ key: '1', label: '編輯' }, { key: '2', label: '刪除', danger: true }] }}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <OrderDetailsDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        order={selectedOrder} 
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={2} className="!mb-1 !font-light">銷售訂單</Title>
          <Text className="text-gray-500">管理所有的客戶訂單與交易記錄</Text>
        </div>
        <Space>
          <Segmented
            options={[
              { value: 'list', icon: <BarsOutlined /> },
              { value: 'board', icon: <AppstoreOutlined /> },
            ]}
            value={viewMode}
            onChange={(value) => setViewMode(value as 'list' | 'board')}
            className="glass-segment"
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>匯出報表</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" className="shadow-lg shadow-blue-500/30">
            新增訂單
          </Button>
        </Space>
      </div>

      <SalesAnalytics />

      {/* Filter Section */}
      <Card className="glass-card !border-0" bodyStyle={{ padding: '20px' }}>
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <Space size="middle" className="flex-1">
            <Input 
              prefix={<SearchOutlined className="text-gray-400" />} 
              placeholder="搜尋訂單編號或客戶..." 
              className="!w-64 !rounded-lg"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <RangePicker className="!rounded-lg" />
            <Button icon={<FilterOutlined />}>篩選</Button>
          </Space>
          <div className="text-gray-500 text-sm">
            共 {initialData.length} 筆訂單
          </div>
        </div>
      </Card>

      {/* Content Section */}
      {viewMode === 'list' ? (
        <Card className="glass-card !border-0" bodyStyle={{ padding: 0 }}>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={initialData}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              className: 'cursor-pointer'
            })}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 筆`,
              className: "p-4"
            }}
            className="custom-table"
          />
        </Card>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4 items-start">
          <KanbanColumn 
            title="處理中" 
            status="pending" 
            orders={initialData.filter(o => o.status === 'pending')} 
            color="bg-blue-500" 
            onClick={handleRowClick}
          />
          <KanbanColumn 
            title="已完成" 
            status="completed" 
            orders={initialData.filter(o => o.status === 'completed')} 
            color="bg-green-500" 
            onClick={handleRowClick}
          />
          <KanbanColumn 
            title="已取消" 
            status="cancelled" 
            orders={initialData.filter(o => o.status === 'cancelled')} 
            color="bg-red-500" 
            onClick={handleRowClick}
          />
        </div>
      )}

      <BulkActionBar 
        selectedCount={selectedRowKeys.length}
        onClear={() => setSelectedRowKeys([])}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
        onComplete={handleBulkComplete}
      />
    </motion.div>
  )
}

export default SalesPage
