import React, { useEffect, useState } from 'react'
import { Card, Button, Table, Tag, Drawer, Form, Input, InputNumber, DatePicker, Select, Space, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { expenseService, ReimbursementItem } from '../services/expense.service'
import { useAuth } from '../contexts/AuthContext'

interface ExpenseRequestRow {
  id: string
  reimbursementItemName: string
  amount: number
  currency: string
  expenseDate: string
  status: string
  createdAt: string
}

const receiptTypeLabelMap: Record<string, string> = {
  TAX_INVOICE: '發票',
  RECEIPT: '收據',
  BANK_SLIP: '銀行水單',
  INTERNAL_ONLY: '內部單據',
}

const ExpenseRequestsPage: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [reimbursementItems, setReimbursementItems] = useState<ReimbursementItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ReimbursementItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  // TODO: 從實際 user / 設定中取得 entityId、roles、departmentId
  const entityId = 'tw-entity-001'
  const roles: string[] = []
  const departmentId: string | undefined = undefined

  const [data] = useState<ExpenseRequestRow[]>([])

  useEffect(() => {
    const loadReimbursementItems = async () => {
      try {
        setLoading(true)
        const items = await expenseService.getReimbursementItems(entityId, roles, departmentId)
        setReimbursementItems(items)
      } catch (error) {
        console.error(error)
        message.error('無法載入報銷項目，請稍後再試')
      } finally {
        setLoading(false)
      }
    }

    loadReimbursementItems()
  }, [entityId, roles, departmentId])

  const columns: ColumnsType<ExpenseRequestRow> = [
    {
      title: '報銷項目',
      dataIndex: 'reimbursementItemName',
      key: 'reimbursementItemName',
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number, record) => `${record.currency} ${value.toFixed(0)}`,
    },
    {
      title: '發生日期',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => {
        const color =
          value === 'approved' ? 'green' : value === 'rejected' ? 'red' : value === 'pending' ? 'gold' : 'default'
        const label =
          value === 'approved' ? '已核准' : value === 'rejected' ? '已拒絕' : value === 'pending' ? '審核中' : value
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '申請時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
  ]

  const handleOpenDrawer = () => {
    setSelectedItem(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const handleReimbursementItemChange = (id: string) => {
    const item = reimbursementItems.find((x) => x.id === id) || null
    setSelectedItem(item)
    // 重置憑證類型，避免殘留不允許的值
    form.setFieldsValue({ receiptType: undefined })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedItem) {
        message.error('請先選擇報銷項目')
        return
      }
      setSubmitting(true)

      await expenseService.createExpenseRequest({
        entityId,
        reimbursementItemId: selectedItem.id,
        amount: values.amount,
        currency: 'TWD',
        expenseDate: values.expenseDate.format('YYYY-MM-DD'),
        description: values.description,
        receiptType: values.receiptType,
      })

      message.success('費用申請已送出')
      setDrawerOpen(false)
      // TODO: 重新載入列表資料
    } catch (error) {
      if ((error as any).errorFields) {
        return
      }
      console.error(error)
      message.error('送出申請時發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const allowedReceiptTypes = selectedItem?.allowedReceiptTypes
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            費用申請
          </h1>
          <p className="text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>
            讓員工以標準化報銷項目提交費用申請，並對應正式會計科目。
          </p>
        </div>
        <Button type="primary" onClick={handleOpenDrawer} className="rounded-full px-5 shadow-md">
          新增費用申請
        </Button>
      </div>

      <Card className="glass-panel" bodyStyle={{ padding: 16 }}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base md:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            我的費用申請
          </h2>
          {/* 預留篩選器：狀態 / 期間 */}
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={false}
          locale={{ emptyText: '目前尚無費用申請紀錄' }}
        />
      </Card>

      <Drawer
        title="新增費用申請"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={480}
        destroyOnClose
        styles={{ body: { paddingBottom: 24 } }}
      >
        <Form layout="vertical" form={form} initialValues={{ amount: 0 }}>
          <Form.Item
            label="報銷項目"
            name="reimbursementItemId"
            rules={[{ required: true, message: '請選擇報銷項目' }]}
          >
            <Select
              placeholder="請選擇報銷項目"
              onChange={handleReimbursementItemChange}
              loading={loading}
              options={reimbursementItems.map((item) => ({
                label: (
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    {item.description && (
                      <span className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>
                        {item.description}
                      </span>
                    )}
                  </div>
                ),
                value: item.id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            label="金額（TWD）"
            name="amount"
            rules={[{ required: true, message: '請輸入金額' }]}
          >
            <InputNumber<number>
              min={0}
              precision={0}
              className="w-full"
              formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
              parser={(value) => {
                if (!value) return 0
                const numeric = Number(value.replace(/,/g, ''))
                return Number.isNaN(numeric) ? 0 : numeric
              }}
            />
          </Form.Item>

          <Form.Item
            label="發生日期"
            name="expenseDate"
            rules={[{ required: true, message: '請選擇發生日期' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item label="憑證類型" name="receiptType" rules={[{ required: true, message: '請選擇憑證類型' }]}
          >
            <Select
              placeholder={selectedItem ? '請選擇憑證類型' : '請先選擇報銷項目'}
              disabled={!selectedItem}
              options={
                allowedReceiptTypes?.map((type) => ({
                  label: receiptTypeLabelMap[type] || type,
                  value: type,
                })) || []
              }
            />
          </Form.Item>

          <Form.Item label="備註說明" name="description">
            <Input.TextArea rows={3} placeholder="可填寫用途、對象、專案代號等說明" />
          </Form.Item>

          {selectedItem && allowedReceiptTypes && (
            <div className="mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="mr-2">此報銷項目允許的憑證：</span>
              <Space size={[4, 4]} wrap>
                {allowedReceiptTypes.map((type) => (
                  <Tag key={type} color="blue" bordered={false}>
                    {receiptTypeLabelMap[type] || type}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit} className="px-6">
              送出申請
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}

export default ExpenseRequestsPage
