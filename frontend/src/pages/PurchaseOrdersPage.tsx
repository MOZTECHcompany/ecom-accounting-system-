import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, Space, Tooltip, message } from 'antd'
import { FileTextOutlined, PlusOutlined, ReloadOutlined, ScanOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { purchaseService, PurchaseOrder } from '../services/purchase.service'

const { Title } = Typography

const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate()
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
    { title: '採購單號', dataIndex: 'id', key: 'id', render: (id: string) => id.slice(0, 8) },
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
          'pending': 'blue',
          'received': 'green',
          'completed': 'green',
          'cancelled': 'red'
        }
        return <Tag color={colors[status] || 'default'}>{status.toUpperCase()}</Tag>
      }
    },
    { 
      title: '總金額', 
      dataIndex: 'totalAmountOriginal', 
      key: 'totalAmountOriginal',
      render: (val: number) => `$${Number(val).toFixed(2)}`
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PurchaseOrder) => (
        <Space>
          {record.status === 'pending' && (
            <Tooltip title="收貨流程尚未提供正確倉庫選擇，為避免入錯庫存暫時停用">
              <span>
                <Button type="primary" size="small" icon={<ScanOutlined />} disabled>收貨（安全檢查中）</Button>
              </span>
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-2 py-4 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Title level={2} className="!mb-0 !text-2xl sm:!text-3xl">採購訂單 (PO)</Title>
          <p className="text-gray-500 mt-1">管理向供應商的採購流程與進貨驗收</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:flex lg:flex-wrap lg:justify-end">
          <Button className="w-full lg:w-auto" icon={<ReloadOutlined />} onClick={fetchOrders}>重新整理</Button>
          <Button className="w-full lg:w-auto" icon={<FileTextOutlined />} onClick={() => navigate('/sales/quotations')}>
            客戶報價單
          </Button>
          <Tooltip title="後端已有建立能力，但前端表單尚未完成">
            <span className="w-full lg:w-auto">
              <Button className="w-full lg:w-auto" type="primary" icon={<PlusOutlined />} size="large" disabled>
                建立採購單（介面未完成）
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm rounded-xl border-0">
        <Table 
          columns={columns} 
          dataSource={orders} 
          rowKey="id"
          loading={loading}
          scroll={{ x: 760 }}
        />
      </Card>
    </motion.div>
  )
}

export default PurchaseOrdersPage
