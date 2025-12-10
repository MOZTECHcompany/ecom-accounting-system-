import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber, message } from 'antd'
import { PlusOutlined, BarcodeOutlined, ReloadOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { productService, Product } from '../services/product.service'

const { Title } = Typography
const { Option } = Select

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const data = await productService.findAll()
      setProducts(data)
    } catch (error) {
      message.error('無法載入產品列表')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleCreate = async (values: any) => {
    try {
      await productService.create(values)
      message.success('產品建立成功')
      setIsModalVisible(false)
      form.resetFields()
      fetchProducts()
    } catch (error) {
      message.error('建立失敗')
    }
  }

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: '名稱', dataIndex: 'name', key: 'name' },
    { 
      title: '類型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>
    },
    { title: '單位', dataIndex: 'unit', key: 'unit' },
    { 
      title: '移動平均成本', 
      dataIndex: 'movingAverageCost', 
      key: 'movingAverageCost',
      render: (val: number) => `$${Number(val).toFixed(2)}`
    },
    { 
      title: '最新進價', 
      dataIndex: 'latestPurchasePrice', 
      key: 'latestPurchasePrice',
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
          <Title level={2} className="!mb-0">產品與庫存管理</Title>
          <p className="text-gray-500 mt-1">管理所有商品資料、庫存數量與成本結構</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchProducts}>重新整理</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsModalVisible(true)}>
            新增產品
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm rounded-xl border-0">
        <Table 
          columns={columns} 
          dataSource={products} 
          rowKey="id" 
          loading={loading}
        />
      </Card>

      <Modal
        title="新增產品"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
            <Input placeholder="例如: PB-001" />
          </Form.Item>
          <Form.Item name="name" label="產品名稱" rules={[{ required: true }]}>
            <Input placeholder="例如: Power Bank 10000mAh" />
          </Form.Item>
          <Form.Item name="type" label="類型" rules={[{ required: true }]}>
            <Select>
              <Option value="RAW_MATERIAL">原物料 (Raw Material)</Option>
              <Option value="SEMI_FINISHED">半成品 (Semi-Finished)</Option>
              <Option value="FINISHED_GOOD">製成品 (Finished Good)</Option>
              <Option value="SERVICE">服務 (Service)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="unit" label="單位" rules={[{ required: true }]}>
            <Input placeholder="例如: pcs, kg, m" />
          </Form.Item>
          <Form.Item name="minStockLevel" label="最低庫存水位">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  )
}

export default ProductsPage
