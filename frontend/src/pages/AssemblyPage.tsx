import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, Space, message } from 'antd'
import { PlusOutlined, ToolOutlined, ReloadOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { assemblyService, AssemblyOrder } from '../services/assembly.service'

const { Title } = Typography

const AssemblyPage: React.FC = () => {
  const [orders, setOrders] = useState<AssemblyOrder[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await assemblyService.findAll()
      setOrders(data)
    } catch (error) {
      message.error('無法載入組裝工單')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const columns = [
    { title: '工單編號', dataIndex: 'woNumber', key: 'woNumber' },
    { 
      title: '生產產品', 
      dataIndex: ['product', 'name'], 
      key: 'product' 
    },
    { title: '預計產量', dataIndex: 'quantity', key: 'quantity' },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          'PLANNED': 'default',
          'IN_PROGRESS': 'processing',
          'COMPLETED': 'success',
          'CANCELLED': 'red'
        }
        return <Tag color={colors[status]}>{status}</Tag>
      }
    },
    { 
      title: '開始時間', 
      dataIndex: 'startDate', 
      key: 'startDate',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-'
    },
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
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchOrders}>重新整理</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large">
            建立工單
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm rounded-xl border-0">
        <Table 
          columns={columns} 
          dataSource={orders} 
          rowKey="id"
          loading={loading}
        />
      </Card>
    </motion.div>
  )
}

export default AssemblyPage
