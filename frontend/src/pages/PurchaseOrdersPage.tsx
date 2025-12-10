import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, Space, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { purchaseService, PurchaseOrder } from '../services/purchase.service'

const { Title } = Typography

const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await purchaseService.findAll()
      setOrders(data)
    } catch (error) {
      message.error('無法載入採購訂單')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const columns = [
    { title: '採購單號', dataIndex: 'poNumber', key: 'poNumber' },
    { 
      title: '供應商', 
      dataIndex: ['vendor', 'name'], 
      key: 'vendor' 
    },
    { 
      title: '日期', 
      dataIndex: 'orderDate', 
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          'DRAFT': 'default',
          'ORDERED': 'blue',
          'RECEIVED': 'green',
          'CANCELLED': 'red'
        }
        return <Tag color={colors[status]}>{status}</Tag>
      }
    },
    { 
      title: '總金額', 
      dataIndex: 'totalAmount', 
      key: 'totalAmount',
      render: (val: number) => `$${Number(val).toFixed(2)}`
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
          <Title level={2} className="!mb-0">採購訂單 (PO)</Title>
          <p className="text-gray-500 mt-1">管理向供應商的採購流程與進貨驗收</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchOrders}>重新整理</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large">
            建立採購單
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

export default PurchaseOrdersPage
