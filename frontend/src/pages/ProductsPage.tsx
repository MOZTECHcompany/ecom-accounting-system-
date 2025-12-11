import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber, message, Checkbox } from 'antd'
import { PlusOutlined, BarcodeOutlined, ReloadOutlined, MinusCircleOutlined } from '@ant-design/icons'
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
      const { attributesList, ...rest } = values
      const attributes = attributesList?.reduce((acc: any, curr: any) => {
        if (curr.key) acc[curr.key] = curr.value
        return acc
      }, {})

      await productService.create({ ...rest, attributes })
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
    { title: '國際條碼', dataIndex: 'barcode', key: 'barcode' },
    { title: '原廠型號', dataIndex: 'modelNumber', key: 'modelNumber' },
    { title: '名稱', dataIndex: 'name', key: 'name' },
    { 
      title: '類型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type: string, record: Product) => (
        <Space>
          <Tag>{type}</Tag>
          {record.hasSerialNumbers && <Tag color="blue">SN追蹤</Tag>}
        </Space>
      )
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
          <Form.Item name="barcode" label="國際條碼 (Barcode)" rules={[{ required: true, message: '國際條碼為必填' }]}>
            <Input placeholder="例如: 4710000000000" prefix={<BarcodeOutlined />} />
          </Form.Item>
          <Form.Item name="modelNumber" label="原廠型號 (Model No.)">
            <Input placeholder="例如: A2890" />
          </Form.Item>
          <Form.Item name="hasSerialNumbers" valuePropName="checked">
            <Checkbox>啟用單品序號追蹤 (Serial Number Tracking)</Checkbox>
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

          <Form.Item name="parentId" label="主產品 (若為變體)">
            <Select allowClear showSearch optionFilterProp="children">
              {products.map(p => (
                <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Typography.Text strong>變體屬性 (例如: Color: Red)</Typography.Text>
          <Form.List name="attributesList">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'key']}
                      rules={[{ required: true, message: 'Missing key' }]}
                    >
                      <Input placeholder="屬性 (如: Color)" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: true, message: 'Missing value' }]}
                    >
                      <Input placeholder="值 (如: Red)" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    新增屬性
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </motion.div>
  )
}

export default ProductsPage
