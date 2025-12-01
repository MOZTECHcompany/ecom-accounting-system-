import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Drawer,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Popconfirm
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  DeleteOutlined,
  EditOutlined,
  DollarCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { arService } from '../services/ar.service'
import { ArInvoice } from '../types'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ArInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<ArInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const result = await arService.getInvoices()
      setInvoices(result.items)
    } catch (error) {
      message.error('載入發票失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  // Calculate statistics from loaded invoices
  const stats = useMemo(() => {
    const totalReceivable = invoices
      .filter(i => i.status !== 'PAID')
      .reduce((sum, i) => sum + (i.amountOriginal || 0), 0)
    
    const overdueAmount = invoices
      .filter(i => i.status === 'OVERDUE')
      .reduce((sum, i) => sum + (i.amountOriginal || 0), 0)

    const collectedThisMonth = invoices
      .filter(i => i.status === 'PAID' && dayjs(i.issueDate).isSame(dayjs(), 'month')) // Approximation
      .reduce((sum, i) => sum + (i.paidAmountOriginal || i.amountOriginal || 0), 0)

    return { totalReceivable, overdueAmount, collectedThisMonth }
  }, [invoices])

  const handleOpenDrawer = (invoice?: ArInvoice) => {
    if (invoice) {
      setEditingId(invoice.id)
      form.setFieldsValue({
        ...invoice,
        issueDate: dayjs(invoice.issueDate),
        dueDate: dayjs(invoice.dueDate),
      })
    } else {
      setEditingId(null)
      form.resetFields()
      form.setFieldsValue({
        issueDate: dayjs(),
        dueDate: dayjs().add(30, 'day')
      })
    }
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        issueDate: values.issueDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        items: values.items || [],
        amountOriginal: values.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0,
        amountCurrency: 'TWD',
      }
      
      if (editingId) {
        await arService.updateInvoice(editingId, payload)
        message.success('發票更新成功')
      } else {
        await arService.createInvoice(payload)
        message.success('發票建立成功')
      }
      
      setDrawerOpen(false)
      form.resetFields()
      fetchInvoices()
    } catch (error) {
      console.error(error)
      message.error('儲存失敗')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await arService.deleteInvoice(id)
      message.success('發票已刪除')
      fetchInvoices()
    } catch (error) {
      message.error('刪除失敗')
    }
  }

  const columns = [
    { title: '發票號碼', dataIndex: 'invoiceNo', key: 'invoiceNo' },
    { title: '客戶', dataIndex: 'customerId', key: 'customerId' },
    { 
      title: '開立日期', 
      dataIndex: 'issueDate', 
      key: 'issueDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    { 
      title: '到期日', 
      dataIndex: 'dueDate', 
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    { 
      title: '金額', 
      dataIndex: 'amountOriginal', 
      key: 'amountOriginal',
      render: (val: number) => `$${(val || 0).toLocaleString()}`
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default'
        if (status === 'PAID') color = 'green'
        if (status === 'OVERDUE') color = 'red'
        if (status === 'SENT') color = 'blue'
        return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ArInvoice) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleOpenDrawer(record)}
          />
          <Popconfirm title="確定要刪除嗎？" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-end">
        <div>
          <Title level={2} className="!mb-1 !font-light">應收帳款 (AR)</Title>
          <Text className="text-gray-500">管理客戶發票與收款</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenDrawer()}>
          建立發票
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="總應收金額"
              value={stats.totalReceivable}
              precision={0}
              prefix={<DollarCircleOutlined />}
              suffix="TWD"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="逾期金額"
              value={stats.overdueAmount}
              precision={0}
              prefix={<ClockCircleOutlined />}
              suffix="TWD"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="本月已收款 (預估)"
              value={stats.collectedThisMonth}
              precision={0}
              prefix={<CheckCircleOutlined />}
              suffix="TWD"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-card" bordered={false}>
        <Form layout="inline" className="mb-6">
          <Form.Item name="search">
            <Input prefix={<SearchOutlined />} placeholder="搜尋發票號碼/客戶" />
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Button>篩選</Button>
          </Form.Item>
        </Form>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={invoices}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Drawer
        title={editingId ? "編輯發票" : "建立新發票"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              {editingId ? "更新" : "建立"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Card title="基本資訊" bordered={false} className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="customerId" label="客戶" rules={[{ required: true }]}>
                  <Select placeholder="選擇客戶">
                    <Select.Option value="CUST001">範例客戶 A</Select.Option>
                    <Select.Option value="CUST002">範例客戶 B</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="invoiceNo" label="發票號碼" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="issueDate" label="開立日期" rules={[{ required: true }]}>
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dueDate" label="到期日" rules={[{ required: true }]}>
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="發票項目" bordered={false} className="mb-4">
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: 'Missing description' }]}
                      >
                        <Input placeholder="項目說明" style={{ width: 240 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Missing quantity' }]}
                      >
                        <InputNumber placeholder="數量" min={1} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'unitPrice']}
                        rules={[{ required: true, message: 'Missing price' }]}
                      >
                        <InputNumber placeholder="單價" min={0} />
                      </Form.Item>
                      <DeleteOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      新增項目
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>

          <Card title="其他" bordered={false}>
            <Form.Item name="notes" label="備註">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Card>
        </Form>
      </Drawer>
    </motion.div>
  )
}

export default ArInvoicesPage
