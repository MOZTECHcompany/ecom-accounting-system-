import React from 'react'
import { Card, Typography, Table, Button, Tag, Space } from 'antd'
import { PlusOutlined, BarcodeOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'

const { Title } = Typography

const ProductsPage: React.FC = () => {
  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: '名稱', dataIndex: 'name', key: 'name' },
    { title: '類別', dataIndex: 'category', key: 'category' },
    { 
      title: '庫存', 
      dataIndex: 'stock', 
      key: 'stock',
      render: (stock: number) => (
        <Tag color={stock < 10 ? 'red' : 'green'}>{stock}</Tag>
      )
    },
    { title: '成本', dataIndex: 'cost', key: 'cost' },
    { title: '售價', dataIndex: 'price', key: 'price' },
  ]

  const data = [
    { key: '1', sku: 'PB-001', name: 'Power Bank 10000mAh', category: 'Electronics', stock: 1200, cost: 450, price: 890 },
    { key: '2', sku: 'CB-002', name: 'USB-C Cable 1m', category: 'Accessories', stock: 5000, cost: 45, price: 199 },
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
        <Button type="primary" icon={<PlusOutlined />} size="large">
          新增產品
        </Button>
      </div>

      <Card className="shadow-sm rounded-xl border-0">
        <Table columns={columns} dataSource={data} />
      </Card>
    </motion.div>
  )
}

export default ProductsPage
