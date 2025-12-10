import React, { useState, useEffect } from 'react'
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
  BarsOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import OrderDetailsDrawer from '../components/OrderDetailsDrawer'
import SalesAnalytics from '../components/SalesAnalytics'
import BulkActionBar from '../components/BulkActionBar'
import { salesService, SalesOrder } from '../services/sales.service'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const KanbanColumn: React.FC<{ title: string; status: string; orders: SalesOrder[]; color: string; onClick: (order: SalesOrder) => void }> = ({ title, status, orders, color, onClick }) => (
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
          key={order.id}
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onClick(order)}
          className="glass-card p-4 cursor-pointer !bg-white/80 hover:!bg-white/90 dark:!bg-white/10 dark:hover:!bg-white/20"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-blue-600 font-medium text-sm">{order.orderNumber}</span>
            <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">{order.customerName || 'Guest'}</div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-500 text-sm">{order.items?.length || 0} items</span>
            <span className="font-mono font-medium dark:text-gray-300">NT$ {Number(order.totalAmount).toLocaleString()}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
)

const SalesPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await salesService.findAll()
      setOrders(data)
    } catch (error) {
      message.error('無法載入訂單')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(orders)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sales Orders")
    XLSX.writeFile(wb, "sales_orders_export.xlsx")
    message.success('報表匯出成功')
  }

  const handleRowClick = (record: SalesOrder) => {
    setSelectedOrder(record)
    setDrawerOpen(true)
  }

  const handleBulkComplete = () => {
    message.success(`已完成 ${selectedRowKeys.length} 筆訂單`)
    setSelectedRowKeys([])
  }

  const columns = [
    {
      title: '訂單編號',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string) => <a className="font-medium text-blue-600">{text}</a>,
    },
    {
      title: '客戶',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string) => text || 'Guest',
    },
    {
      title: '日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '金額',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => <span className="font-mono">NT$ {Number(amount).toLocaleString()}</span>,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          completed: 'success',
          pending: 'processing',
          cancelled: 'error',
        }
        const icons: Record<string, React.ReactNode> = {
          completed: <CheckCircleOutlined />,
          pending: <ClockCircleOutlined />,
          cancelled: <CloseCircleOutlined />,
        }
        return (
          <Tag icon={icons[status]} color={colors[status]}>
            {status.toUpperCase()}
          </Tag>
        )
      },
    },
    {
      title: '付款方式',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => <Tag>{status}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="text" icon={<MoreOutlined />} />
      ),
    },
  ]

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(searchText.toLowerCase()) ||
    (order.customerName && order.customerName.toLowerCase().includes(searchText.toLowerCase()))
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={2} className="!mb-0">銷售訂單</Title>
          <Text type="secondary">管理所有銷售渠道的訂單與出貨狀態</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchOrders}>重新整理</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>匯出報表</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large">新增訂單</Button>
        </Space>
      </div>

      {/* Analytics Cards */}
      <SalesAnalytics />

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 glass-panel p-4">
        <Space size="large">
          <Input 
            placeholder="搜尋訂單編號或客戶..." 
            prefix={<SearchOutlined className="text-gray-400" />} 
            className="w-64"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <RangePicker />
          <Button icon={<FilterOutlined />}>篩選</Button>
        </Space>
        <Segmented
          options={[
            { label: '列表', value: 'list', icon: <BarsOutlined /> },
            { label: '看板', value: 'board', icon: <AppstoreOutlined /> },
          ]}
          value={viewMode}
          onChange={(val) => setViewMode(val as 'list' | 'board')}
        />
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <Card className="shadow-sm rounded-xl border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            loading={loading}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              className: 'cursor-pointer hover:bg-gray-50 transition-colors'
            })}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4">
          <KanbanColumn 
            title="待處理 (Pending)" 
            status="pending" 
            orders={filteredOrders.filter(o => o.status === 'pending')} 
            color="bg-blue-500"
            onClick={handleRowClick}
          />
          <KanbanColumn 
            title="已完成 (Completed)" 
            status="completed" 
            orders={filteredOrders.filter(o => o.status === 'completed')} 
            color="bg-green-500"
            onClick={handleRowClick}
          />
          <KanbanColumn 
            title="已取消 (Cancelled)" 
            status="cancelled" 
            orders={filteredOrders.filter(o => o.status === 'cancelled')} 
            color="bg-red-500"
            onClick={handleRowClick}
          />
        </div>
      )}

      {/* Bulk Actions */}
      <BulkActionBar 
        selectedCount={selectedRowKeys.length} 
        onClear={() => setSelectedRowKeys([])}
        actions={[
          { label: '批次完成', onClick: handleBulkComplete, type: 'primary' },
          { label: '列印出貨單', onClick: () => {}, icon: <PrinterOutlined /> },
          { label: '匯出選取', onClick: () => {}, icon: <DownloadOutlined /> },
        ]}
      />

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        order={selectedOrder as any} // Type casting for now as OrderDetailsDrawer might expect different type
      />
    </motion.div>
  )
}

export default SalesPage

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
        <Space wrap>
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
          <Space size="middle" className="flex-1 w-full" wrap>
            <Input 
              prefix={<SearchOutlined className="text-gray-400" />} 
              placeholder="搜尋訂單編號或客戶..." 
              className="!w-full md:!w-64 !rounded-lg"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <RangePicker className="!w-full md:!w-auto !rounded-lg" />
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
            scroll={{ x: 1000 }}
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
