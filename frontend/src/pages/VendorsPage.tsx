import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Space, Button, Typography, Modal, Form, Input, Select, Switch } from 'antd'
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { vendorService } from '../services/vendor.service'
import { Vendor, CreateVendorDto } from '../types'

const { Title, Text } = Typography
const { Option } = Select

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [form] = Form.useForm()

  const loadVendors = async () => {
    setLoading(true)
    try {
      const data = await vendorService.findAll()
      setVendors(data)
    } catch (error: any) {
      message.error(error.response?.data?.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [])

  const handleAdd = () => {
    setEditingVendor(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Vendor) => {
    setEditingVendor(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await vendorService.remove(id)
      message.success('刪除成功')
      loadVendors()
    } catch (error: any) {
      message.error(error.response?.data?.message || '刪除失敗')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      if (editingVendor) {
        await vendorService.update(editingVendor.id, values)
        message.success('更新成功')
      } else {
        await vendorService.create(values as CreateVendorDto)
        message.success('新增成功')
      }
      setIsModalVisible(false)
      loadVendors()
    } catch (error) {
      // Form validation error
    }
  }

  const columns = [
    {
      title: '供應商代碼',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => <span className="font-mono text-gray-600">{text}</span>
    },
    {
      title: '名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>
    },
    {
      title: '統編',
      dataIndex: 'taxId',
      key: 'taxId',
      width: 120,
    },
    {
      title: '聯絡人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 120,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '幣別',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
      render: (text: string) => <Tag>{text}</Tag>
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'} className="rounded-full border-none">
          {isActive ? '啟用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Vendor) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => {
              Modal.confirm({
                title: '確認刪除',
                content: `確定要刪除供應商 ${record.name} 嗎？`,
                onOk: () => handleDelete(record.id)
              })
            }}
          />
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1">供應商管理</Title>
          <Text type="secondary">管理所有供應商資料與聯絡資訊</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadVendors}>重新整理</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增供應商</Button>
        </Space>
      </div>

      <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/20">
        <Table 
          columns={columns} 
          dataSource={vendors} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        title={editingVendor ? '編輯供應商' : '新增供應商'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true, currency: 'TWD' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="code"
              label="供應商代碼"
              rules={[{ required: true, message: '請輸入代碼' }]}
            >
              <Input placeholder="例如：V001" />
            </Form.Item>
            <Form.Item
              name="name"
              label="供應商名稱"
              rules={[{ required: true, message: '請輸入名稱' }]}
            >
              <Input placeholder="輸入公司名稱" />
            </Form.Item>
            <Form.Item name="taxId" label="統一編號">
              <Input />
            </Form.Item>
            <Form.Item name="contactPerson" label="聯絡人">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="電話">
              <Input />
            </Form.Item>
            <Form.Item name="currency" label="預設幣別">
              <Select>
                <Option value="TWD">TWD - 新台幣</Option>
                <Option value="USD">USD - 美金</Option>
                <Option value="EUR">EUR - 歐元</Option>
                <Option value="JPY">JPY - 日圓</Option>
              </Select>
            </Form.Item>
            <Form.Item name="paymentTerms" label="付款條件">
              <Select>
                <Option value="NET30">月結 30 天</Option>
                <Option value="NET60">月結 60 天</Option>
                <Option value="COD">貨到付款</Option>
              </Select>
            </Form.Item>
            <Form.Item name="address" label="地址" className="md:col-span-2">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="isActive" label="狀態" valuePropName="checked">
              <Switch checkedChildren="啟用" unCheckedChildren="停用" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default VendorsPage
