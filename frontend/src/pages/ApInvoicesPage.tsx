import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { apService } from '../services/ap.service'
import { vendorService } from '../services/vendor.service'
import { ApInvoice, ApInvoiceAlerts, Vendor } from '../types'

const { Title, Text } = Typography
const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  partial: 'blue',
  paid: 'green',
  overdue: 'red',
}
const PAYMENT_FREQUENCIES = [
  { label: '單次付款', value: 'one_time' },
  { label: '每月循環', value: 'monthly' },
]
const PAYMENT_STATUS_OPTIONS = [
  { label: '未付款', value: 'pending' },
  { label: '部分付款', value: 'partial' },
  { label: '已付款', value: 'paid' },
  { label: '逾期', value: 'overdue' },
]

const ApInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<ApInvoice[]>([])
  const [alerts, setAlerts] = useState<ApInvoiceAlerts | null>(null)
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<ApInvoice | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<ApInvoice | null>(null)
  const [form] = Form.useForm()
  const [batchForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [paymentForm] = Form.useForm()

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const [invoiceList, alertStats] = await Promise.all([
        apService.getInvoices(),
        apService.getInvoiceAlerts(),
      ])
      setInvoices(invoiceList)
      setAlerts(alertStats)
    } catch (error) {
      console.error(error)
      message.error('載入發票失敗')
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    setVendorsLoading(true)
    try {
      const vendorList = await vendorService.findAll()
      setVendors(vendorList)
    } catch (error) {
      console.error(error)
      message.error('載入供應商失敗')
    } finally {
      setVendorsLoading(false)
    }
  }

  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        value: vendor.id,
        label: `${vendor.name}${vendor.code ? ` (${vendor.code})` : ''}`,
      })),
    [vendors],
  )

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    if (editingInvoice) {
      editForm.setFieldsValue({
        paymentFrequency: editingInvoice.paymentFrequency ?? 'one_time',
        dueDate: dayjs(editingInvoice.dueDate),
        isRecurringMonthly: editingInvoice.isRecurringMonthly ?? false,
        recurringDayOfMonth:
          editingInvoice.recurringDayOfMonth ?? dayjs(editingInvoice.dueDate).date(),
        notes: editingInvoice.notes,
      })
    }
  }, [editingInvoice, editForm])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        vendorId: values.vendorId,
        invoiceNo: values.invoiceNo,
        amountOriginal: values.amountOriginal,
        amountCurrency: values.amountCurrency || 'TWD',
        amountFxRate: 1,
        amountBase: values.amountOriginal,
        invoiceDate: values.invoiceDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        paymentFrequency: values.paymentFrequency,
        isRecurringMonthly: values.paymentFrequency === 'monthly',
        recurringDayOfMonth:
          values.paymentFrequency === 'monthly'
            ? dayjs(values.dueDate).date()
            : null,
        notes: values.notes,
      }
      
      await apService.createInvoice(payload)
      message.success('發票建立成功')
      setCreateOpen(false)
      form.resetFields()
      fetchInvoices()
    } catch (error) {
      console.error(error)
    }
  }

  const handleBatchImport = async () => {
    try {
      const values = await batchForm.validateFields()
      const payload = values.invoices.map((invoice: any) => ({
        vendorId: invoice.vendorId,
        invoiceNo: invoice.invoiceNo,
        amountOriginal: invoice.amountOriginal,
        amountCurrency: invoice.amountCurrency || 'TWD',
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        paymentFrequency: invoice.paymentFrequency,
        notes: invoice.notes,
      }))

      await apService.batchImportInvoices(values.entityId?.trim(), payload)
      message.success(`已匯入 ${payload.length} 筆發票`)
      setBatchOpen(false)
      batchForm.resetFields()
      fetchInvoices()
    } catch (error) {
      console.error(error)
    }
  }

  const handleOpenEdit = (invoice: ApInvoice) => {
    setEditingInvoice(invoice)
    setEditOpen(true)
  }

  const handleUpdateRecurring = async () => {
    if (!editingInvoice) return
    try {
      const values = await editForm.validateFields()
      await apService.updateInvoice(editingInvoice.id, {
        paymentFrequency: values.paymentFrequency,
        isRecurringMonthly: values.isRecurringMonthly,
        recurringDayOfMonth: values.isRecurringMonthly
          ? values.recurringDayOfMonth
          : null,
        dueDate: values.dueDate?.toISOString(),
        notes: values.notes,
      })
      message.success('付款排程已更新')
      setEditOpen(false)
      setEditingInvoice(null)
      fetchInvoices()
    } catch (error) {
      console.error(error)
    }
  }

  const calculateOutstanding = (invoice: ApInvoice) => {
    const total = Number(invoice.amountOriginal ?? 0)
    const paid = Number(invoice.paidAmountOriginal ?? 0)
    return Math.max(total - paid, 0)
  }

  const handleOpenPayment = (invoice: ApInvoice) => {
    const outstanding = calculateOutstanding(invoice)
    paymentForm.setFieldsValue({
      amount: outstanding || Number(invoice.amountOriginal || 0),
      paymentDate: dayjs(),
      newStatus: outstanding > 0 ? 'paid' : invoice.status,
    })
    setPaymentInvoice(invoice)
    setPaymentOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!paymentInvoice) return
    try {
      const values = await paymentForm.validateFields()
      await apService.recordPayment(paymentInvoice.id, {
        amount: Number(values.amount),
        paymentDate: values.paymentDate?.toISOString(),
        newStatus: values.newStatus,
      })
      message.success('付款已記錄')
      setPaymentOpen(false)
      setPaymentInvoice(null)
      paymentForm.resetFields()
      fetchInvoices()
    } catch (error) {
      console.error(error)
      message.error('記錄付款失敗')
    }
  }

  const getDueIndicator = (invoice: ApInvoice) => {
    const now = dayjs()
    const due = dayjs(invoice.dueDate)
    if (due.isBefore(now, 'day')) {
      return { label: '已逾期', color: 'red' }
    }
    if (due.diff(now, 'day') <= 7) {
      return { label: '7日內到期', color: 'orange' }
    }
    return { label: '正常', color: 'blue' }
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const keyword = searchKeyword.trim().toLowerCase()
      const matchesKeyword = keyword
        ? [
            invoice.invoiceNo,
            invoice.vendorName,
            invoice.vendor?.name,
          ]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(keyword))
        : true
      const matchesStatus =
        statusFilter === 'all' ? true : invoice.status === statusFilter
      return matchesKeyword && matchesStatus
    })
  }, [invoices, searchKeyword, statusFilter])

  const columns = [
    {
      title: '發票號碼',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      render: (_: unknown, record: ApInvoice) => (
        <Space direction="vertical" size={0}>
          <Text>{record.invoiceNo || '-'}</Text>
          <Text type="secondary" className="text-xs">
            {record.vendor?.name || record.vendorName || record.vendorId || '未指定'}
          </Text>
        </Space>
      ),
    },
    {
      title: '開立日期',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (_: string, record: ApInvoice) => {
        const dueMeta = getDueIndicator(record)
        return (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(record.dueDate).format('YYYY-MM-DD')}</Text>
            <Tag color={dueMeta.color}>{dueMeta.label}</Tag>
          </Space>
        )
      },
    },
    {
      title: '金額',
      dataIndex: 'amountOriginal',
      key: 'amountOriginal',
      render: (_: number, record: ApInvoice) => (
        <span>
          {record.amountCurrency} {Number(record.amountOriginal).toLocaleString()}
        </span>
      ),
    },
    {
      title: '付款頻率',
      dataIndex: 'paymentFrequency',
      key: 'paymentFrequency',
      render: (_: string, record: ApInvoice) => (
        <Space direction="vertical" size={0}>
          <Tag color={record.paymentFrequency === 'monthly' ? 'purple' : 'default'}>
            {record.paymentFrequency === 'monthly' ? '每月循環' : '單次付款'}
          </Tag>
          {record.isRecurringMonthly && record.recurringDayOfMonth && (
            <Text type="secondary" className="text-xs">
              每月 {record.recurringDayOfMonth} 日
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: ApInvoice) => (
        <Space>
          <Button
            size="small"
            type="link"
            icon={<DollarCircleOutlined />}
            onClick={() => handleOpenPayment(record)}
          >
            記錄付款
          </Button>
          <Button size="small" type="link" onClick={() => handleOpenEdit(record)}>
            更新排程
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1 !font-light">應付帳款 (AP)</Title>
          <Text className="text-gray-500">管理供應商發票與付款排程</Text>
        </div>
        <Space>
          <Button icon={<CloudUploadOutlined />} onClick={() => {
            batchForm.setFieldsValue({
              invoices: [
                {
                  paymentFrequency: 'one_time',
                  amountCurrency: 'TWD',
                },
              ],
            })
            setBatchOpen(true)
          }}>
            批次匯入
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>
            重新載入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            登記發票
          </Button>
        </Space>
      </div>

      {alerts && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Card bordered={false} className="glass-card">
              <Statistic
                title="未付款"
                value={alerts.unpaid}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered={false} className="glass-card">
              <Statistic
                title="已逾期"
                value={alerts.overdue}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card bordered={false} className="glass-card">
              <Statistic
                title="7 日內到期"
                value={alerts.upcoming}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Alert
        type="warning"
        showIcon
        className="glass-card"
        message="會計提醒"
        description="請優先處理逾期或 7 日內到期的發票，避免供應商催款。"
      />

      <Card className="glass-card" bordered={false}>
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜尋發票號碼或供應商"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: '全部狀態' },
              { value: 'pending', label: '未付款' },
              { value: 'partial', label: '部分付款' },
              { value: 'paid', label: '已付款' },
              { value: 'overdue', label: '已逾期' },
            ]}
          />
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredInvoices}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title="登記供應商發票"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        width={640}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="vendorId" label="供應商" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="選擇供應商"
                loading={vendorsLoading}
                options={vendorOptions}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="invoiceNo" label="發票號碼" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="amountOriginal" label="發票金額" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} prefix="$" precision={2} />
            </Form.Item>
            <Form.Item name="amountCurrency" label="幣別" initialValue="TWD">
              <Select options={[{ value: 'TWD' }, { value: 'USD' }, { value: 'JPY' }]} />
            </Form.Item>
            <Form.Item name="invoiceDate" label="開立日期" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="dueDate" label="到期日" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="paymentFrequency" label="付款頻率" initialValue="one_time">
              <Select options={PAYMENT_FREQUENCIES} />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批次匯入應付發票"
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        onOk={handleBatchImport}
        width={860}
      >
        <Form
          form={batchForm}
          layout="vertical"
          initialValues={{
            invoices: [
              { paymentFrequency: 'one_time', amountCurrency: 'TWD' },
            ],
          }}
        >
          <Form.Item name="entityId" label="實體 ID">
            <Input placeholder="留白則使用預設實體" />
          </Form.Item>

          <Form.List name="invoices">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="bg-slate-50" title={`發票 ${name + 1}`} extra={
                    fields.length > 1 ? (
                      <Button size="small" danger onClick={() => remove(name)}>
                        移除
                      </Button>
                    ) : null
                  }>
                    <Row gutter={12}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'vendorId']}
                          label="供應商"
                          rules={[{ required: true }]}
                        >
                          <Select
                            showSearch
                            placeholder="選擇供應商"
                            loading={vendorsLoading}
                            options={vendorOptions}
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'invoiceNo']}
                          label="發票號碼"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'amountOriginal']}
                          label="金額"
                          rules={[{ required: true }]}
                        >
                          <InputNumber className="w-full" min={0} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'amountCurrency']}
                          label="幣別"
                          initialValue="TWD"
                        >
                          <Select options={[{ value: 'TWD' }, { value: 'USD' }, { value: 'EUR' }]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'invoiceDate']}
                          label="開立日期"
                          rules={[{ required: true }]}
                        >
                          <DatePicker className="w-full" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'dueDate']}
                          label="到期日"
                          rules={[{ required: true }]}
                        >
                          <DatePicker className="w-full" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'paymentFrequency']}
                          label="付款頻率"
                          initialValue="one_time"
                        >
                          <Select options={PAYMENT_FREQUENCIES} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'notes']}
                          label="備註"
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add({ paymentFrequency: 'one_time', amountCurrency: 'TWD' })}>
                  新增發票
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="更新付款排程"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          setEditingInvoice(null)
          editForm.resetFields()
        }}
        onOk={handleUpdateRecurring}
        okText="儲存"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="paymentFrequency" label="付款頻率" rules={[{ required: true }]}>
            <Select options={PAYMENT_FREQUENCIES} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="最新到期日"
            rules={[{ required: true, message: '請選擇到期日' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item
            name="isRecurringMonthly"
            label="每月循環提醒"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="recurringDayOfMonth"
            label="每月扣款日"
            dependencies={['isRecurringMonthly']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue('isRecurringMonthly')) {
                    return Promise.resolve()
                  }
                  if (value && value >= 1 && value <= 31) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('請輸入 1-31 的日期'))
                },
              }),
            ]}
          >
            <InputNumber className="w-full" min={1} max={31} />
          </Form.Item>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="記錄付款"
        open={paymentOpen}
        onCancel={() => {
          setPaymentOpen(false)
          setPaymentInvoice(null)
          paymentForm.resetFields()
        }}
        onOk={handleRecordPayment}
        okText="儲存"
        destroyOnClose
      >
        {paymentInvoice && (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message={`發票 ${paymentInvoice.invoiceNo || paymentInvoice.id}`}
            description={`尚未付款：${paymentInvoice.amountCurrency} ${calculateOutstanding(paymentInvoice).toLocaleString()}`}
          />
        )}
        <Form form={paymentForm} layout="vertical">
          <Form.Item
            name="amount"
            label="付款金額"
            rules={[{ required: true, message: '請輸入金額' }]}
          >
            <InputNumber className="w-full" min={0} prefix="$" precision={2} />
          </Form.Item>
          <Form.Item
            name="paymentDate"
            label="付款日期"
            rules={[{ required: true, message: '請選擇付款日期' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="newStatus" label="更新狀態" rules={[{ required: true }]}>
            <Select options={PAYMENT_STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  )
}

export default ApInvoicesPage
