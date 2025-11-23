import React, { useEffect, useState } from 'react'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Card,
  Divider
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  FileTextOutlined,
  DeleteOutlined
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
  const [createOpen, setCreateOpen] = useState(false)
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

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      // Transform form values to API format
      const payload = {
        ...values,
        issueDate: values.issueDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        items: values.items || [],
        // Calculate totals
        totalAmount: values.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0),
        taxAmount: 0, // Simplified for now
      }
      
      await arService.createInvoice(payload)
      message.success('發票建立成功')
      setCreateOpen(false)
      form.resetFields()
      fetchInvoices()
    } catch (error) {
      console.error(error)
    }
  }

  const columns = [
    { title: '發票號碼', dataIndex: 'invoiceNo', key: 'invoiceNo' },
    { title: '客戶', dataIndex: 'customerId', key: 'customerId' }, // Should map to name
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
      dataIndex: 'totalAmount', 
      key: 'totalAmount',
      render: (val: number) => `$${val.toLocaleString()}`
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          建立發票
        </Button>
      </div>

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

      <Modal
        title="建立新發票"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        width={800}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="customerId" label="客戶" rules={[{ required: true }]}>
              <Select placeholder="選擇客戶">
                <Select.Option value="CUST001">範例客戶 A</Select.Option>
                <Select.Option value="CUST002">範例客戶 B</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="invoiceNo" label="發票號碼" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="issueDate" label="開立日期" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="dueDate" label="到期日" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <Divider>發票項目</Divider>
          
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
                      <Input placeholder="項目說明" style={{ width: 300 }} />
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

          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  )
}

export default ArInvoicesPage
