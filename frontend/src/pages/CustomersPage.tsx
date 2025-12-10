import React, { useState, useEffect } from 'react'
import { Card, Typography, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd'
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { customerService, Customer } from '../services/customer.service'

const { Title } = Typography
const { Option } = Select

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const data = await customerService.findAll()
      setCustomers(data)
    } catch (error) {
      message.error('無法載入客戶列表')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleCreateOrUpdate = async (values: any) => {
    try {
      if (editingId) {
        await customerService.update(editingId, values)
        message.success('客戶更新成功')
      } else {
        await customerService.create(values)
        message.success('客戶建立成功')
      }
      setIsModalVisible(false)
      form.resetFields()
      setEditingId(null)
      fetchCustomers()
    } catch (error) {
      message.error('操作失敗')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await customerService.delete(id)
      message.success('客戶已刪除')
      fetchCustomers()
    } catch (error) {
      message.error('刪除失敗')
    }
  }

  const openEditModal = (record: Customer) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const columns = [
    { title: '名稱', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: '電話', dataIndex: 'phone', key: 'phone' },
    { 
      title: '類型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type: string) => <Tag color={type === 'company' ? 'blue' : 'green'}>{type === 'company' ? '公司' : '個人'}</Tag>
    },
    { title: '統編', dataIndex: 'taxId', key: 'taxId' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Customer) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm title="確定要刪除嗎？" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
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
          <Title level={2} className="!mb-0">客戶管理</Title>
          <p className="text-gray-500 mt-1">管理客戶資料與聯絡資訊</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCustomers}>重新整理</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => {
            setEditingId(null)
            form.resetFields()
            setIsModalVisible(true)
          }}>
            新增客戶
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm rounded-xl border-0">
        <Table 
          columns={columns} 
          dataSource={customers} 
          rowKey="id" 
          loading={loading}
        />
      </Card>

      <Modal
        title={editingId ? "編輯客戶" : "新增客戶"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="name" label="客戶名稱" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="例如: 王小明 或 某某公司" />
          </Form.Item>
          <Form.Item name="type" label="類型" initialValue="individual">
            <Select>
              <Option value="individual">個人</Option>
              <Option value="company">公司</Option>
            </Select>
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="電話">
            <Input />
          </Form.Item>
          <Form.Item name="taxId" label="統一編號">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  )
}

export default CustomersPage
