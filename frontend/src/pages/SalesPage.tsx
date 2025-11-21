import React, { useState } from 'react'
import { Table, Tag, Button, Space, Input, DatePicker, Card, Typography, Dropdown } from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined, 
  MoreOutlined, 
  PrinterOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'

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

const SalesPage: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

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
      render: () => (
        <Space size="small">
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={2} className="!mb-1 !font-light">銷售訂單</Title>
          <Text className="text-gray-500">管理所有的客戶訂單與交易記錄</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />}>匯出報表</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" className="shadow-lg shadow-blue-500/30">
            新增訂單
          </Button>
        </Space>
      </div>

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

      {/* Data Table */}
      <Card className="glass-card !border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={initialData}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 筆`,
            className: "p-4"
          }}
          className="custom-table"
        />
      </Card>
    </motion.div>
  )
}

export default SalesPage
