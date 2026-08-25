import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, message, Modal, Form, Select } from 'antd'
import { FileTextOutlined, ReloadOutlined, ScanOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { purchaseService, PurchaseOrder } from '../services/purchase.service'
import { inventoryService } from '../services/inventory.service'
import { resolveEntityId } from '../services/entities.service'

const { Title } = Typography

const PurchaseOrdersPage: React.FC = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null)
  const [warehouses, setWarehouses] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [receiving, setReceiving] = useState(false)
  const [receiveForm] = Form.useForm()

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

  useEffect(() => {
    if (!receivingOrder) return
    receiveForm.resetFields()
    void (async () => {
      try {
        const entityId = await resolveEntityId()
        const rows = await inventoryService.getWarehouses(entityId)
        setWarehouses(rows)
        if (rows.length > 0) receiveForm.setFieldValue('warehouseId', rows[0].id)
      } catch {
        setWarehouses([])
        message.error('無法載入收貨倉庫')
      }
    })()
  }, [receiveForm, receivingOrder])

  const serialRequirements = (() => {
    const requirements = new Map<string, { productId: string; name: string; sku: string; quantity: number }>()
    for (const item of receivingOrder?.items || []) {
      if (!item.product.hasSerialNumbers) continue
      const current = requirements.get(item.productId) || {
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        quantity: 0,
      }
      current.quantity += Number(item.qty)
      requirements.set(item.productId, current)
    }
    return [...requirements.values()]
  })()

  const handleReceive = async () => {
    if (!receivingOrder) return
    try {
      const values = await receiveForm.validateFields()
      setReceiving(true)
      await purchaseService.receive(
        receivingOrder.id,
        values.warehouseId,
        serialRequirements.map((item) => ({
          productId: item.productId,
          serialNumbers: values.serialNumbers?.[item.productId] || [],
        })),
      )
      message.success('採購單已完成收貨入庫')
      setReceivingOrder(null)
      await fetchOrders()
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) return
      message.error('收貨失敗，庫存未變更')
    } finally {
      setReceiving(false)
    }
  }

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
          'receiving': 'gold',
          'received': 'green',
          'completed': 'green',
          'cancelled': 'red'
        }
        const labels: Record<string, string> = {
          pending: '待收貨', receiving: '收貨中', received: '已收貨', completed: '已完成', cancelled: '已取消',
        }
        return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>
      }
    },
    { 
      title: '總金額', 
      dataIndex: 'totalAmountOriginal', 
      key: 'totalAmountOriginal',
      render: (val: number, record: PurchaseOrder) =>
        new Intl.NumberFormat('zh-TW', { style: 'currency', currency: record.totalAmountCurrency || 'TWD' }).format(Number(val))
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: PurchaseOrder) => record.status === 'pending' ? (
        <Button type="primary" icon={<ScanOutlined />} onClick={() => setReceivingOrder(record)}>收貨入庫</Button>
      ) : null
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
          <Title level={2} className="!mb-0 !text-2xl sm:!text-3xl">採購訂單</Title>
          <p className="text-gray-500 mt-1">管理向供應商的採購流程與進貨驗收</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:flex lg:flex-wrap lg:justify-end">
          <Button className="w-full lg:w-auto" icon={<ReloadOutlined />} onClick={fetchOrders}>重新整理</Button>
          <Button className="w-full lg:w-auto" icon={<FileTextOutlined />} onClick={() => navigate('/sales/quotations')}>
            客戶報價單
          </Button>
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

      <Modal
        title="收貨入庫"
        open={Boolean(receivingOrder)}
        onCancel={() => setReceivingOrder(null)}
        onOk={handleReceive}
        okText="確認入庫"
        cancelText="取消"
        confirmLoading={receiving}
        okButtonProps={{ disabled: warehouses.length === 0 }}
      >
        <Form form={receiveForm} layout="vertical" className="pt-3">
          <Form.Item name="warehouseId" label="收貨倉庫" rules={[{ required: true, message: '請選擇收貨倉庫' }]}>
            <Select
              placeholder="選擇倉庫"
              options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: `${warehouse.code} · ${warehouse.name}`,
              }))}
            />
          </Form.Item>
          {serialRequirements.map((item) => (
            <Form.Item
              key={item.productId}
              name={['serialNumbers', item.productId]}
              label={`${item.name}（${item.sku}）序號 · ${item.quantity} 組`}
              rules={[
                { required: true, message: '請掃描或輸入完整序號' },
                {
                  validator: (_, value?: string[]) =>
                    value?.length === item.quantity && new Set(value.map((serial) => serial.trim())).size === item.quantity
                      ? Promise.resolve()
                      : Promise.reject(new Error(`必須輸入 ${item.quantity} 組不重複序號`)),
                },
              ]}
            >
              <Select mode="tags" tokenSeparators={[',', ' ', '\n']} placeholder="掃描或輸入序號" />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </motion.div>
  )
}

export default PurchaseOrdersPage
