import React from 'react'
import { Card, Typography, Table, Button, Tag, Space } from 'antd'
import { PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'

const { Title } = Typography

const PurchaseOrdersPage: React.FC = () => {
  const columns = [
    { title: '採購單號', dataIndex: 'poNumber', key: 'poNumber' },
    { title: '供應商', dataIndex: 'vendor', key: 'vendor' },
    { title: '日期', dataIndex: 'date', key: 'date' },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          'Draft': 'default',
          'Ordered': 'blue',
          'Received': 'green',
          'Cancelled': 'red'
        }
        return <Tag color={colors[status]}>{status}</Tag>
      }
    },
    { title: '總金額', dataIndex: 'total', key: 'total' },
  ]

  const data = [
    { key: '1', poNumber: 'PO-20251201-001', vendor: 'TechSupply Co.', date: '2025-12-01', status: 'Received', total: '$45,000' },
    { key: '2', poNumber: 'PO-20251205-002', vendor: 'CableMaster Ltd.', date: '2025-12-05', status: 'Ordered', total: '$12,500' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="!mb-0">採購訂單 (PO)</Title>
          <p className="text-gray-500 mt-1">管理向供應商的採購流程與進貨驗收</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          建立採購單
        </Button>
      </div>

      <Card className="shadow-sm rounded-xl border-0">
        <Table columns={columns} dataSource={data} />
      </Card>
    </motion.div>
  )
}

export default PurchaseOrdersPage
