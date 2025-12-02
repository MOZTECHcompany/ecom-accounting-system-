import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card,
  Button,
  Table,
  Tag,
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  message,
  Typography,
  Divider,
  Timeline,
  Descriptions,
  Segmented,
  Upload,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  BulbOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  expenseService,
  ReimbursementItem,
  ExpenseRequest,
  ExpenseHistoryEntry,
} from '../services/expense.service'
import { accountingService } from '../services/accounting.service'
import type { Account } from '../types'
import { useAuth } from '../contexts/AuthContext'

const { Text, Title } = Typography

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

const receiptTypeLabelMap: Record<string, string> = {
  TAX_INVOICE: '發票',
  RECEIPT: '收據',
  BANK_SLIP: '銀行水單',
  INTERNAL_ONLY: '內部單據',
}

const statusMeta: Record<
  string,
  {
    label: string
    color: string
  }
> = {
  pending: { label: '審核中', color: 'gold' },
  approved: { label: '已核准', color: 'green' },
  rejected: { label: '已駁回', color: 'red' },
  draft: { label: '草稿', color: 'default' },
  paid: { label: '已付款', color: 'blue' },
}

const historyLabelMap: Record<string, string> = {
  submitted: '已提交',
  approved: '核准',
  rejected: '駁回',
  pending: '審核中',
}

type ViewMode = 'mine' | 'pending'

type ValidationErrorShape = {
  errorFields?: unknown
}

type ApiErrorShape = {
  response?: {
    data?: {
      message?: string
    }
  }
}

const toNumber = (value?: string | number | null) => {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value)
}

const confidenceColor = (value?: number) => {
  if (value === undefined) return 'default'
  if (value >= 0.8) return 'green'
  if (value >= 0.5) return 'blue'
  return 'default'
}

const hasValidationErrorFields = (error: unknown): error is ValidationErrorShape =>
  typeof error === 'object' && error !== null && 'errorFields' in error

const extractApiMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorShape
    return apiError.response?.data?.message
  }
  return undefined
}

const ExpenseRequestsPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestIdFromQuery = searchParams.get('requestId')?.trim() || null
  const isAdmin = useMemo(
    () => (user?.roles ?? []).some((role) => role === 'SUPER_ADMIN' || role === 'ADMIN'),
    [user],
  )
  const [viewMode, setViewMode] = useState<ViewMode>('mine')
  const [listLoading, setListLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [reimbursementItems, setReimbursementItems] = useState<ReimbursementItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ReimbursementItem | null>(null)
  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)
  const [history, setHistory] = useState<ExpenseHistoryEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [form] = Form.useForm()
  const [approvalForm] = Form.useForm()

  const roleKey = useMemo(() => (user?.roles ?? []).join(','), [user])
  const resolvedRoles = useMemo(() => (roleKey ? roleKey.split(',').filter(Boolean) : []), [roleKey])
  const entityId = DEFAULT_ENTITY_ID
  const departmentId: string | undefined = undefined

  const fetchReimbursementItems = useCallback(async () => {
    try {
      const items = await expenseService.getReimbursementItems(
        entityId,
        resolvedRoles,
        departmentId,
      )
      setReimbursementItems(items)
    } catch (error) {
      console.error(error)
      message.error('無法載入報銷項目')
    }
  }, [departmentId, entityId, resolvedRoles])

  const refreshRequests = useCallback(async () => {
    try {
      setListLoading(true)
      const query =
        viewMode === 'pending'
          ? { entityId, status: 'pending' }
          : { entityId, mine: true }
      const requestList = await expenseService.getExpenseRequests(query)
      setRequests(Array.isArray(requestList) ? requestList : [])
    } catch (error) {
      console.error(error)
      message.error('無法載入費用申請列表')
      setRequests([])
    } finally {
      setListLoading(false)
    }
  }, [entityId, viewMode])

  useEffect(() => {
    fetchReimbursementItems()
  }, [fetchReimbursementItems])

  useEffect(() => {
    refreshRequests()
  }, [refreshRequests])

  useEffect(() => {
    if (!isAdmin && viewMode === 'pending') {
      setViewMode('mine')
    }
  }, [isAdmin, viewMode])

  useEffect(() => {
    if (!detailDrawerOpen || !isAdmin) {
      return
    }
    setAccountsLoading(true)
    accountingService
      .getAccounts(entityId)
      .then(setAccounts)
      .catch((error) => {
        console.error(error)
        message.error('無法載入會計科目')
      })
      .finally(() => setAccountsLoading(false))
  }, [detailDrawerOpen, entityId, isAdmin])

  useEffect(() => {
    if (detailDrawerOpen && selectedRequest) {
      approvalForm.setFieldsValue({
        finalAccountId:
          selectedRequest.finalAccount?.id ||
          selectedRequest.suggestedAccount?.id ||
          undefined,
        remark: '',
        rejectReason: '',
        rejectNote: '',
      })
    } else {
      approvalForm.resetFields()
    }
  }, [approvalForm, detailDrawerOpen, selectedRequest])

  const handleOpenDrawer = () => {
    setSelectedItem(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const handleReimbursementItemChange = (id: string) => {
    const item = reimbursementItems.find((x) => x.id === id) || null
    setSelectedItem(item)
    form.setFieldsValue({
      receiptType: item?.defaultReceiptType,
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedItem) {
        message.error('請先選擇報銷項目')
        return
      }
      setSubmitting(true)

      const files = values.files || []
      const evidenceFiles = await Promise.all(
        files.map(async (file: any) => {
          const originFile = file.originFileObj
          return new Promise<{ name: string; url: string; mimeType: string }>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(originFile)
            reader.onload = () =>
              resolve({
                name: originFile.name,
                url: reader.result as string,
                mimeType: originFile.type,
              })
            reader.onerror = (error) => reject(error)
          })
        }),
      )

      const payload = {
        entityId,
        reimbursementItemId: selectedItem.id,
        amountOriginal: values.amount,
        amountCurrency: 'TWD',
        description: values.description,
        receiptType: values.receiptType,
        dueDate: values.expenseDate ? values.expenseDate.toISOString() : undefined,
        metadata: values.expenseDate
          ? { expenseDate: values.expenseDate.format('YYYY-MM-DD') }
          : undefined,
        evidenceFiles: evidenceFiles.length > 0 ? evidenceFiles : undefined,
      }

      const response = await expenseService.createExpenseRequest(payload)

      const rawConfidence =
        response.suggestionConfidence === undefined || response.suggestionConfidence === null
          ? undefined
          : Number(response.suggestionConfidence)
      const confidence = rawConfidence !== undefined && !Number.isNaN(rawConfidence) ? rawConfidence : undefined
      const suggestion = response.suggestedAccount
        ? `（建議：${response.suggestedAccount.code} ${response.suggestedAccount.name}${
            confidence !== undefined ? ` · ${(confidence * 100).toFixed(0)}%` : ''
          }）`
        : ''
      message.success(`費用申請已送出${suggestion}`)
      setDrawerOpen(false)
      form.resetFields()
      setSelectedItem(null)
      await refreshRequests()
    } catch (error) {
      if (hasValidationErrorFields(error)) {
        return
      }
      console.error(error)
      message.error(extractApiMessage(error) || '送出申請時發生錯誤，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const openRequestDetail = useCallback(
    async (requestOrId: ExpenseRequest | string, options?: { fromNotification?: boolean }) => {
      let resolvedRequest: ExpenseRequest | null =
        typeof requestOrId === 'string' ? null : requestOrId

      setDetailDrawerOpen(true)
      setHistory([])
      setHistoryLoading(true)

      if (resolvedRequest) {
        setSelectedRequest(resolvedRequest)
      } else {
        setSelectedRequest(null)
        try {
          resolvedRequest = await expenseService.getExpenseRequest(requestOrId as string)
          setSelectedRequest(resolvedRequest)
        } catch (error) {
          console.error(error)
          message.error('無法取得費用申請詳情，請稍後再試')
          setHistoryLoading(false)
          setDetailDrawerOpen(false)
          return
        }
      }

      if (!resolvedRequest) {
        setHistoryLoading(false)
        return
      }

      try {
        const entries = await expenseService.getExpenseRequestHistory(resolvedRequest.id)
        setHistory(entries)
        if (options?.fromNotification) {
          message.success('已定位到通知中的費用申請')
        }
      } catch (error) {
        console.error(error)
        message.error('無法取得歷程紀錄，請稍後再試')
      } finally {
        setHistoryLoading(false)
      }
    },
    [],
  )

  const handleOpenDetail = (request: ExpenseRequest) => {
    void openRequestDetail(request)
  }

  useEffect(() => {
    if (!requestIdFromQuery) {
      return
    }

    let cancelled = false

    ;(async () => {
      await openRequestDetail(requestIdFromQuery, { fromNotification: true })
      if (!cancelled) {
        navigate('/ap/expenses', { replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [requestIdFromQuery, openRequestDetail, navigate])

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false)
    setSelectedRequest(null)
    setHistory([])
    approvalForm.resetFields()
  }

  const handleApproveRequest = async () => {
    if (!selectedRequest) {
      return
    }
    try {
      const { finalAccountId, remark } = approvalForm.getFieldsValue()
      setApproveLoading(true)
      await expenseService.approveExpenseRequest(selectedRequest.id, {
        finalAccountId: finalAccountId || undefined,
        remark: remark?.trim() || undefined,
      })
      message.success('已核准該費用申請')
      handleCloseDetail()
      await refreshRequests()
    } catch (error) {
      console.error(error)
      message.error(extractApiMessage(error) || '核准失敗，請稍後再試')
    } finally {
      setApproveLoading(false)
    }
  }

  const handleRejectRequest = async () => {
    if (!selectedRequest) {
      return
    }
    try {
      const { rejectReason, rejectNote } = await approvalForm.validateFields([
        'rejectReason',
        'rejectNote',
      ])
      const reason = (rejectReason as string | undefined)?.trim()
      if (!reason) {
        message.error('請輸入駁回原因')
        return
      }
      setRejectLoading(true)
      await expenseService.rejectExpenseRequest(selectedRequest.id, {
        reason,
        note: (rejectNote as string | undefined)?.trim() || undefined,
      })
      message.success('已駁回該費用申請')
      handleCloseDetail()
      await refreshRequests()
    } catch (error) {
      if (hasValidationErrorFields(error)) {
        return
      }
      console.error(error)
      message.error(extractApiMessage(error) || '駁回失敗，請稍後再試')
    } finally {
      setRejectLoading(false)
    }
  }

  const handlePredictCategory = async () => {
    const description = form.getFieldValue('description')
    if (!description || !description.trim()) {
      message.warning('請先輸入備註說明，AI 才能進行分析')
      return
    }

    try {
      setPredicting(true)
      const result = await expenseService.predictCategory(entityId, description)
      if (result && result.suggestedItem) {
        const item = reimbursementItems.find((i) => i.id === result.suggestedItem?.id)
        if (item) {
          form.setFieldsValue({ reimbursementItemId: item.id })
          setSelectedItem(item)
          message.success({
            content: (
              <div className="flex flex-col">
                <span>
                  AI 建議：<span className="font-bold">{item.name}</span> (信心度 {(result.confidence * 100).toFixed(0)}%)
                </span>
                {item.account && <span className="text-xs text-gray-500 mt-1">科目：{item.account.code} {item.account.name}</span>}
                {item.description && <span className="text-xs text-gray-400 mt-0.5">{item.description}</span>}
              </div>
            ),
            icon: <BulbOutlined style={{ color: '#faad14' }} />,
            duration: 4,
          })
        } else {
          // 如果找不到對應的項目，嘗試重新載入列表
          console.log('Suggested item not found in current list, refreshing...')
          await fetchReimbursementItems()
          // 重新尋找
          const refreshedItems = await expenseService.getReimbursementItems(entityId, resolvedRoles, departmentId)
          const refreshedItem = refreshedItems.find((i) => i.id === result.suggestedItem?.id)
          
          if (refreshedItem) {
             setReimbursementItems(refreshedItems)
             form.setFieldsValue({ reimbursementItemId: refreshedItem.id })
             setSelectedItem(refreshedItem)
             message.success({
              content: (
                <div className="flex flex-col">
                  <span>
                    AI 建議：<span className="font-bold">{refreshedItem.name}</span> (信心度 {(result.confidence * 100).toFixed(0)}%)
                  </span>
                  {refreshedItem.account && <span className="text-xs text-gray-500 mt-1">科目：{refreshedItem.account.code} {refreshedItem.account.name}</span>}
                  {refreshedItem.description && <span className="text-xs text-gray-400 mt-0.5">{refreshedItem.description}</span>}
                </div>
              ),
              icon: <BulbOutlined style={{ color: '#faad14' }} />,
              duration: 4,
            })
          } else {
             message.info('AI 建議的項目目前不可用')
          }
        }
      } else {
        message.info('AI 無法判斷合適的報銷項目，請手動選擇')
      }
    } catch (error) {
      console.error(error)
      message.error('AI 分析失敗，請稍後再試')
    } finally {
      setPredicting(false)
    }
  }

  const allowedReceiptTypes = selectedItem?.allowedReceiptTypes
    ?.split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const canReview = Boolean(isAdmin && selectedRequest?.status === 'pending')

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: '報銷項目',
      dataIndex: ['reimbursementItem', 'name'],
      key: 'reimbursementItem',
      render: (_, record) => (
        <span className="font-medium text-gray-800">{record.reimbursementItem?.name || '--'}</span>
      ),
    },
    {
      title: '金額',
      dataIndex: 'amountOriginal',
      key: 'amountOriginal',
      render: (_: unknown, record) => {
        const amount = toNumber(record.amountOriginal)
        return (
          <span className="font-mono text-gray-700">
            {record.amountCurrency || 'TWD'} {amount.toLocaleString()}
          </span>
        )
      },
    },
    {
      title: '智能建議',
      key: 'suggestedAccount',
      render: (_: unknown, record) => {
        if (!record.suggestedAccount) {
          return <Text type="secondary">—</Text>
        }
        const confidence = Number(record.suggestionConfidence ?? 0)
        return (
          <Space size={4} direction="vertical">
            <Space size={4}>
              <Tag color="blue" bordered={false}>
                {record.suggestedAccount.code}
              </Tag>
              <span>{record.suggestedAccount.name}</span>
            </Space>
            <Tag color={confidenceColor(confidence)} bordered={false}>
              信心 {(confidence * 100).toFixed(0)}%
            </Tag>
          </Space>
        )
      },
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => {
        const meta = statusMeta[value] || { label: value, color: 'default' }
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '申請時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record) => (
        <Button type="link" size="small" onClick={() => handleOpenDetail(record)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <Title level={2} className="!mb-1 !font-light">費用申請</Title>
          <Text className="text-gray-500">以標準化報銷項目提交費用，並串接智慧科目建議與審批歷程。</Text>
        </div>
        <Space>
          {isAdmin && (
            <Segmented
              options={[
                { label: '我的申請', value: 'mine' },
                { label: '待審清單', value: 'pending' },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
            />
          )}
          <Button onClick={refreshRequests} disabled={listLoading}>
            重新整理
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenDrawer}>
            新增費用申請
          </Button>
        </Space>
      </div>

      <Card className="glass-card" bordered={false}>
        <div className="flex justify-between items-center mb-3">
          <Title level={4} className="!mb-0">
            {viewMode === 'mine' ? '我的費用申請' : '待審核申請'}
          </Title>
        </div>
        <Table
          rowKey="id"
          loading={listLoading}
          columns={columns}
          dataSource={requests}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: '目前尚無費用申請紀錄' }}
        />
      </Card>

      <Drawer
        title="新增費用申請"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={520}
        destroyOnClose
        styles={{ body: { paddingBottom: 24 } }}
      >
        <Form layout="vertical" form={form} initialValues={{ amount: 0 }}>
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
            <Form.Item label="備註說明" style={{ marginBottom: 0 }} required>
              <div className="mb-2 text-gray-500 text-xs">
                請輸入費用內容（如：文具、計程車費 560），AI 將自動建議報銷項目並填入金額。
              </div>
              <Form.Item name="description" noStyle rules={[{ required: true, message: '請輸入備註說明' }]}>
                <Input.TextArea
                  rows={3}
                  placeholder="例如：搭計程車去拜訪客戶 560 元"
                  style={{ marginBottom: 12 }}
                  onChange={(e) => {
                    const value = e.target.value
                    // Try to extract amount from description (e.g. "Taxi 560" -> 560)
                    // Matches numbers at the end of string or after spaces
                    const match = value.match(/(?:^|\s)(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s|$|元|TWD|NT)/)
                    if (match) {
                      const amountStr = match[1].replace(/,/g, '')
                      const amount = parseFloat(amountStr)
                      if (!isNaN(amount)) {
                        form.setFieldValue('amount', amount)
                      }
                    }
                  }}
                />
              </Form.Item>
              <Button
                block
                icon={<BulbOutlined />}
                onClick={handlePredictCategory}
                loading={predicting}
                className="border-blue-200 text-blue-600 hover:!border-blue-400 hover:!text-blue-500 bg-white"
              >
                AI 智能建議報銷項目
              </Button>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="發生日期"
              name="expenseDate"
              rules={[{ required: true, message: '請選擇發生日期' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item
              label="金額（TWD）"
              name="amount"
              rules={[{ required: true, message: '請輸入金額' }]}
              extra={<span className="text-orange-500 text-xs flex items-center gap-1"><ExclamationCircleOutlined /> 請務必再次確認金額</span>}
            >
              <InputNumber<number>
                min={0}
                precision={0}
                className="w-full"
                placeholder="請輸入金額"
                formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                parser={(value) => {
                  if (!value) return 0
                  const numeric = Number(value.replace(/,/g, ''))
                  return Number.isNaN(numeric) ? 0 : numeric
                }}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="報銷項目"
            name="reimbursementItemId"
            rules={[{ required: true, message: '請選擇報銷項目' }]}
          >
            <Select
              placeholder="請選擇報銷項目（可使用上方 AI 建議）"
              onChange={handleReimbursementItemChange}
              loading={listLoading}
              showSearch
              optionFilterProp="label"
              options={reimbursementItems.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="憑證類型"
            name="receiptType"
            rules={[{ required: true, message: '請選擇憑證類型' }]}
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

          <Form.Item
            label="憑證/單據照片"
            name="files"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) return e
              return e?.fileList
            }}
          >
            <Upload
              listType="picture"
              beforeUpload={() => false}
              maxCount={5}
              accept="image/*,.pdf"
            >
              <Button icon={<UploadOutlined />}>上傳照片</Button>
            </Upload>
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

      <Drawer
        title="申請詳情"
        placement="right"
        onClose={handleCloseDetail}
        open={detailDrawerOpen}
        width={520}
        destroyOnClose
        styles={{ body: { paddingBottom: 24 } }}
      >
        {!selectedRequest ? (
          <Text type="secondary">請選擇申請查看詳情</Text>
        ) : (
          <>
            <Descriptions bordered column={1} size="small" labelStyle={{ width: 120 }}>
              <Descriptions.Item label="報銷項目">
                {selectedRequest.reimbursementItem?.name || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="金額">
                {selectedRequest.amountCurrency || 'TWD'} {toNumber(selectedRequest.amountOriginal).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="狀態">
                <Tag color={statusMeta[selectedRequest.status]?.color || 'default'}>
                  {statusMeta[selectedRequest.status]?.label || selectedRequest.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="系統建議">
                {selectedRequest.suggestedAccount ? (
                  <Space direction="vertical" size={0}>
                    <span>
                      {selectedRequest.suggestedAccount.code} · {selectedRequest.suggestedAccount.name}
                    </span>
                    {selectedRequest.suggestionConfidence && (
                      <Text type="secondary">
                        信心 {(Number(selectedRequest.suggestionConfidence) * 100).toFixed(0)}%
                      </Text>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="最終科目">
                {selectedRequest.finalAccount ? (
                  <span>
                    {selectedRequest.finalAccount.code} · {selectedRequest.finalAccount.name}
                  </span>
                ) : (
                  <Text type="secondary">尚未指定</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="備註">
                {selectedRequest.description || <Text type="secondary">—</Text>}
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            <Title level={5} style={{ marginBottom: 16 }}>
              歷程紀錄
            </Title>
            <div className="max-h-72 overflow-y-auto px-1 pt-1 pb-4">
              <Timeline
                mode="left"
                pending={historyLoading ? '讀取中...' : undefined}
                items={history.map((entry) => ({
                  color:
                    entry.action === 'approved'
                      ? 'green'
                      : entry.action === 'rejected'
                      ? 'red'
                      : 'blue',
                  children: (
                    <div className="pb-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm font-medium leading-relaxed">
                        <span className="font-bold text-gray-700">
                          {historyLabelMap[entry.action] || entry.action}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {dayjs(entry.createdAt).format('YYYY/MM/DD HH:mm')}
                        </span>
                      </div>
                      {entry.actor && (
                        <div className="text-xs text-gray-500 mt-1">由 {entry.actor.name}</div>
                      )}
                      {entry.note && (
                        <div className="text-sm mt-2 text-gray-600 break-words whitespace-pre-wrap leading-relaxed p-2 bg-gray-50 rounded-md border border-gray-100">
                          {entry.note}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
              {!historyLoading && history.length === 0 && (
                <Text type="secondary">尚無歷程紀錄</Text>
              )}
            </div>

            {canReview && (
              <>
                <Divider />
                <Title level={5} style={{ marginBottom: 16 }}>
                  審核操作（管理員）
                </Title>
                <Form layout="vertical" form={approvalForm} requiredMark={false}>
                  <Form.Item label="最終會計科目" name="finalAccountId">
                    <Select
                      allowClear
                      showSearch
                      placeholder="選擇最終會計科目"
                      loading={accountsLoading}
                      optionFilterProp="label"
                      options={accounts.map((account) => ({
                        label: `${account.code} ｜ ${account.name}`,
                        value: account.id,
                      }))}
                    />
                  </Form.Item>

                  <Form.Item label="核准備註" name="remark">
                    <Input.TextArea rows={2} placeholder="可填寫核准說明" />
                  </Form.Item>

                  <Form.Item label="駁回原因" name="rejectReason" tooltip="駁回時必填">
                    <Input.TextArea rows={2} placeholder="若要駁回請輸入原因" />
                  </Form.Item>

                  <Form.Item label="駁回補充說明" name="rejectNote">
                    <Input.TextArea rows={2} placeholder="可填寫額外說明或要求" />
                  </Form.Item>

                  <Space className="w-full justify-end">
                    <Button danger onClick={handleRejectRequest} loading={rejectLoading}>
                      駁回
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleApproveRequest}
                      loading={approveLoading}
                    >
                      核准
                    </Button>
                  </Space>
                </Form>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default ExpenseRequestsPage
