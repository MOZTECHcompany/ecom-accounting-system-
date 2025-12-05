import React, { useEffect, useMemo, useState } from 'react'
import { GlassDrawer, GlassDrawerSection } from '../components/ui/GlassDrawer'
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ShopOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { vendorService } from '../services/vendor.service'
import { Vendor, CreateVendorDto } from '../types'

const { Title, Text } = Typography
const { Option } = Select

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [form] = Form.useForm()

  const loadVendors = async () => {
    setLoading(true)
    try {
      const data = await vendorService.findAll()
      setVendors(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error(error.response?.data?.message || '載入失敗')
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [])

  const stats = useMemo(() => {
    const total = vendors.length
    const active = vendors.filter(v => v.isActive).length
    return { total, active }
  }, [vendors])

  const filteredVendors = useMemo(() => {
    if (!searchKeyword) return vendors
    const lower = searchKeyword.toLowerCase()
    return vendors.filter(
      v =>
        v.name.toLowerCase().includes(lower) ||
        v.code.toLowerCase().includes(lower) ||
        v.taxId?.includes(lower)
    )
  }, [vendors, searchKeyword])

  const handleAdd = () => {
    setEditingVendor(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, currency: 'TWD' })
    setDrawerOpen(true)
  }

  const handleEdit = (record: Vendor) => {
    setEditingVendor(record)
    form.setFieldsValue(record)
    setDrawerOpen(true)
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingVendor) {
        await vendorService.update(editingVendor.id, values)
        message.success('更新成功')
      } else {
        await vendorService.create(values as CreateVendorDto)
        message.success('新增成功')
      }
      setDrawerOpen(false)
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
          <Popconfirm
            title="確認刪除"
            description={`確定要刪除供應商 ${record.name} 嗎？`}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <Title level={2} className="!mb-1 !font-light">供應商管理</Title>
          <Text className="text-gray-500">管理所有供應商資料與聯絡資訊</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadVendors}>重新整理</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增供應商</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={12}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="供應商總數"
              value={stats.total}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="活躍供應商"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-card" bordered={false}>
        <Form layout="inline" className="mb-6">
          <Form.Item name="search">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜尋代碼、名稱或統編"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ minWidth: 280 }}
            />
          </Form.Item>
        </Form>

        <Table 
          columns={columns} 
          dataSource={filteredVendors} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <GlassDrawer
        title={editingVendor ? '編輯供應商' : '新增供應商'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          className="h-full flex flex-col"
        >
          <div className="flex-1 space-y-4">
            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">基本資料</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="code"
                    label="供應商代碼"
                    rules={[{ required: true, message: '請輸入代碼' }]}
                  >
                    <Input placeholder="例如：V001" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="供應商名稱"
                    rules={[{ required: true, message: '請輸入名稱' }]}
                  >
                    <Input placeholder="輸入公司名稱" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="taxId" label="統一編號">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isActive" label="狀態" valuePropName="checked">
                    <Switch checkedChildren="啟用" unCheckedChildren="停用" />
                  </Form.Item>
                </Col>
              </Row>
            </GlassDrawerSection>

            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">聯絡資訊</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="contactPerson" label="聯絡人">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="電話">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="address" label="地址">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
              </Row>
            </GlassDrawerSection>

            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">財務設定</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="currency" label="預設幣別">
                    <Select>
                      <Option value="TWD">TWD - 新台幣</Option>
                      <Option value="USD">USD - 美金</Option>
                      <Option value="EUR">EUR - 歐元</Option>
                      <Option value="JPY">JPY - 日圓</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="paymentTerms" label="付款條件">
                    <Select>
                      <Option value="NET30">月結 30 天</Option>
                      <Option value="NET60">月結 60 天</Option>
                      <Option value="COD">貨到付款</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </GlassDrawerSection>
          </div>

          <GlassDrawerSection>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDrawerOpen(false)} className="rounded-full">取消</Button>
              <Button type="primary" onClick={handleSubmit} className="rounded-full bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-200">
                {editingVendor ? '更新' : '新增'}
              </Button>
            </div>
          </GlassDrawerSection>
        </Form>
      </GlassDrawer>
    </div>
  )
}

export default VendorsPage
