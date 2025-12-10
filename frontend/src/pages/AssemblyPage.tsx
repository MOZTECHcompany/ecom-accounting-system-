import React from 'react'
import { Card, Typography, Table, Button, Tag, Space } from 'antd'
import { PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'

const { Title } = Typography

const AssemblyPage: React.FC = () => {
  const columns = [
    { title: '工單編號', dataIndex: 'woNumber', key: 'woNumber' },
    { title: '生產產品', dataIndex: 'product', key: 'product' },
    { title: '預計產量', dataIndex: 'quantity', key: 'quantity' },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          'Planned': 'default',
          'In Progress': 'processing',
          'Completed': 'success',
        }
        return <Tag color={colors[status]}>{status}</Tag>
      }
    },
    { title: '開始時間', dataIndex: 'startDate', key: 'startDate' },
  ]

  const data = [
    { key: '1', woNumber: 'WO-20251202-001', product: 'Power Bank 10000mAh (White)', quantity: 500, status: 'Completed', startDate: '2025-12-02' },
    { key: '2', woNumber: 'WO-20251208-002', product: 'Power Bank 10000mAh (Black)', quantity: 300, status: 'In Progress', startDate: '2025-12-08' },
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
          <Title level={2} className="!mb-0">組裝與製造 (Assembly)</Title>
          <p className="text-gray-500 mt-1">管理產品組裝工單 (Work Orders) 與 BOM 表</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          建立工單
        </Button>
      </div>

      <Card className="shadow-sm rounded-xl border-0">
        <Table columns={columns} dataSource={data} />
      </Card>
    </motion.div>
  )
}

export default AssemblyPage
