import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Result,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import {
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileSearchOutlined,
  FilterOutlined,
  FireOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import {
  expenseService,
  type ExpenseRequest,
} from '../services/expense.service'
import { accountingService } from '../services/accounting.service'
import type { Account } from '../types'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

type FilterState = {
  statuses: string[]
  payeeType: string
  priority: string
  search: string
  dateRange: [Dayjs, Dayjs] | null
  minAmount?: number
  maxAmount?: number
}

type ActionMode = 'approve' | 'reject'

type ActionState = {
  mode: ActionMode
  request: ExpenseRequest | null
}

const baseFilters: FilterState = {
  statuses: ['pending'],
  payeeType: 'all',
  priority: 'all',
  search: '',
  dateRange: null,
}

const createDefaultFilters = (): FilterState => ({
  statuses: [...baseFilters.statuses],
  payeeType: baseFilters.payeeType,
  priority: baseFilters.priority,
  search: baseFilters.search,
  dateRange: baseFilters.dateRange,
  minAmount: baseFilters.minAmount,
  maxAmount: baseFilters.maxAmount,
})

const statusLabelMap: Record<string, string> = {
  pending: '審核中',
  approved: '已核准',
  rejected: '已駁回',
  draft: '草稿',
  paid: '已付款',
}

const statusColorMap: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  draft: 'default',
  paid: 'blue',
}

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0
  return typeof value === 'number' ? value : Number(value)
}

const isUrgentRequest = (request: ExpenseRequest) => {
  if (request.status !== 'pending') return false
  if (request.priority === 'urgent') return true
  if (!request.dueDate) return false
  return dayjs(request.dueDate).diff(dayjs(), 'day') <= 2
}

const isOverdue = (request: ExpenseRequest) => {
  if (!request.dueDate) return false
  return dayjs().isAfter(dayjs(request.dueDate), 'day')
}

const ExpenseReviewCenterPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = useMemo(
    () => (user?.roles ?? []).some((role) => role === 'SUPER_ADMIN' || role === 'ADMIN'),
    [user],
  )

  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(() => createDefaultFilters())
  const [filterForm] = Form.useForm()
  const [actionForm] = Form.useForm()
  const [actionState, setActionState] = useState<ActionState>({ mode: 'approve', request: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)

  const entityId = DEFAULT_ENTITY_ID

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      const result = await expenseService.getExpenseRequests({ entityId })
      setRequests(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error(error)
      message.error('無法載入費用資料，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    filterForm.setFieldsValue(createDefaultFilters())
  }, [filterForm])

  useEffect(() => {
    if (!isAdmin) return
    setAccountsLoading(true)
    accountingService
      .getAccounts(entityId)
      .then(setAccounts)
      .catch((error) => {
        console.error(error)
        message.error('無法載入會計科目')
      })
      .finally(() => setAccountsLoading(false))
  }, [entityId, isAdmin])

  const handleFiltersChange = (_: unknown, values: FilterState) => {
    setFilters({
      statuses: values.statuses?.length ? values.statuses : [],
      payeeType: values.payeeType ?? 'all',
      priority: values.priority ?? 'all',
      search: values.search ?? '',
      dateRange:
        values.dateRange && values.dateRange.length === 2 ? values.dateRange : null,
      minAmount: values.minAmount,
      maxAmount: values.maxAmount,
    })
  }

  const handleResetFilters = () => {
    const defaults = createDefaultFilters()
    filterForm.setFieldsValue(defaults)
    setFilters(defaults)
  }

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests],
  )

  const urgentQueue = useMemo(
    () => pendingRequests.filter(isUrgentRequest).sort((a, b) => {
      const dueA = a.dueDate ? dayjs(a.dueDate).valueOf() : Number.MAX_SAFE_INTEGER
      const dueB = b.dueDate ? dayjs(b.dueDate).valueOf() : Number.MAX_SAFE_INTEGER
      return dueA - dueB
    }),
    [pendingRequests],
  )

  const flaggedRequests = useMemo(
    () =>
      pendingRequests.filter(
        (request) => !request.suggestedAccount || isOverdue(request),
      ),
    [pendingRequests],
  )

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (filters.statuses.length && !filters.statuses.includes(request.status)) {
        return false
      }
      if (filters.payeeType !== 'all' && request.payeeType !== filters.payeeType) {
        return false
      }
      if (filters.priority !== 'all' && request.priority !== filters.priority) {
        return false
      }
      if (filters.search) {
        const keyword = filters.search.trim().toLowerCase()
        const haystack = `${request.description || ''} ${request.reimbursementItem?.name || ''}`.toLowerCase()
        if (!haystack.includes(keyword)) {
          return false
        }
      }
      if (filters.dateRange) {
        const [start, end] = filters.dateRange
        const windowStart = start.startOf('day').valueOf()
        const windowEnd = end.endOf('day').valueOf()
        const created = dayjs(request.createdAt).valueOf()
        if (created < windowStart || created > windowEnd) {
          return false
        }
      }
      if (filters.minAmount && toNumber(request.amountOriginal) < filters.minAmount) {
        return false
      }
      if (filters.maxAmount && toNumber(request.amountOriginal) > filters.maxAmount) {
        return false
      }
      return true
    })
  }, [filters, requests])

  const backlogAmount = useMemo(
    () => pendingRequests.reduce((sum, request) => sum + toNumber(request.amountOriginal), 0),
    [pendingRequests],
  )

  const averagePendingAge = useMemo(() => {
    if (!pendingRequests.length) return 0
    const totalDays = pendingRequests.reduce(
      (sum, request) => sum + dayjs().diff(dayjs(request.createdAt), 'day'),
      0,
    )
    return Math.round(totalDays / pendingRequests.length)
  }, [pendingRequests])

  const openActionModal = (mode: ActionMode, request: ExpenseRequest) => {
    setActionState({ mode, request })
    actionForm.resetFields()
  }

  const closeActionModal = () => {
    setActionState({ mode: 'approve', request: null })
    actionForm.resetFields()
  }

  const handleActionSubmit = async () => {
    if (!actionState.request) {
      return
    }
    try {
      setActionLoading(true)
      if (actionState.mode === 'approve') {
        const values = await actionForm.validateFields(['finalAccountId', 'remark'])
        await expenseService.approveExpenseRequest(actionState.request.id, {
          finalAccountId: values.finalAccountId || undefined,
          remark: values.remark?.trim() || undefined,
        })
        message.success('已快速核准該申請')
      } else {
        const values = await actionForm.validateFields(['reason', 'note'])
        if (!values.reason || !values.reason.trim()) {
          message.error('請輸入駁回原因')
          return
        }
        await expenseService.rejectExpenseRequest(actionState.request.id, {
          reason: values.reason.trim(),
          note: values.note?.trim() || undefined,
        })
        message.success('已駁回該申請')
      }
      closeActionModal()
      void loadRequests()
    } catch (error) {
      console.error(error)
      if ('errorFields' in (error as Record<string, unknown>)) {
        return
      }
      message.error('操作失敗，請稍後再試')
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: '申請項目',
      dataIndex: 'reimbursementItem',
      key: 'reimbursementItem',
      width: 250,
      render: (_value, record) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 text-base">
            {record.reimbursementItem?.name || '未分類項目'}
          </span>
          <span className="text-gray-500 text-sm line-clamp-1">
            {record.description || '無詳細說明'}
          </span>
        </div>
      ),
    },
    {
      title: '金額',
      dataIndex: 'amountOriginal',
      key: 'amountOriginal',
      align: 'right',
      width: 150,
      render: (_value, record) => (
        <div className="flex flex-col items-end">
          <span className="font-mono font-semibold text-gray-800 text-base">
            {toNumber(record.amountOriginal).toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">{record.amountCurrency || 'TWD'}</span>
        </div>
      ),
    },
    {
      title: '狀態 / 優先度',
      key: 'status',
      width: 140,
      render: (_value, record) => (
        <div className="flex flex-col gap-1">
          <Tag color={statusColorMap[record.status]} className="w-fit m-0">
            {statusLabelMap[record.status]}
          </Tag>
          {record.priority === 'urgent' && (
            <Tag color="red" className="w-fit m-0 flex items-center gap-1">
              <FireOutlined /> 急件
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'AI 建議科目',
      key: 'ai',
      width: 200,
      render: (_value, record) => {
        if (!record.suggestedAccount) {
          return <span className="text-gray-400 text-sm">—</span>
        }
        const confidence = Number(record.suggestionConfidence ?? 0)
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Tag color="blue" className="m-0 font-mono">
                {record.suggestedAccount.code}
              </Tag>
              <span className="text-sm text-gray-700 truncate max-w-[100px]">
                {record.suggestedAccount.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                percent={Math.round(confidence * 100)} 
                size="small" 
                steps={5} 
                strokeColor={confidence > 0.8 ? '#52c41a' : '#faad14'}
                showInfo={false}
                className="w-16 m-0"
              />
              <span className="text-xs text-gray-400">{Math.round(confidence * 100)}%</span>
            </div>
          </div>
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_value, record) => (
        <div className="flex items-center gap-2">
          <Tooltip title="查看詳情">
            <Button
              type="text"
              shape="circle"
              icon={<FileSearchOutlined className="text-gray-500" />}
              onClick={() => navigate(`/ap/expenses?requestId=${record.id}`)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="核准">
                <Button
                  type="text"
                  shape="circle"
                  className="bg-green-50 hover:bg-green-100 border border-green-200"
                  icon={<CheckCircleOutlined className="text-green-600" />}
                  onClick={() => openActionModal('approve', record)}
                />
              </Tooltip>
              <Tooltip title="駁回">
                <Button
                  type="text"
                  shape="circle"
                  className="bg-red-50 hover:bg-red-100 border border-red-200"
                  icon={<CloseCircleOutlined className="text-red-600" />}
                  onClick={() => openActionModal('reject', record)}
                />
              </Tooltip>
            </>
          )}
        </div>
      ),
    },
  ]

  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="無權限"
        subTitle="只有會計或系統管理員可以存取費用審核中心"
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回儀表板
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <Title level={3} className="!mb-1 !font-light tracking-tight text-gray-800">
            費用審核中心
          </Title>
          <Text className="text-gray-500">
            集中管理與審核各項費用申請，確保財務合規。
          </Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/ap/expenses')}>費用申請列表</Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadRequests()} loading={loading}>
            重新整理
          </Button>
        </Space>
      </div>

      {/* Stats Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-panel p-5 flex items-center justify-between h-full">
            <div>
              <div className="text-gray-500 text-sm mb-1">待審件數</div>
              <div className="text-2xl font-semibold text-gray-800">
                {pendingRequests.length} <span className="text-sm font-normal text-gray-400">件</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <AuditOutlined className="text-xl text-blue-500" />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-panel p-5 flex items-center justify-between h-full">
            <div>
              <div className="text-gray-500 text-sm mb-1">急件申請</div>
              <div className="text-2xl font-semibold text-gray-800">
                {urgentQueue.length} <span className="text-sm font-normal text-gray-400">件</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <FireOutlined className="text-xl text-red-500" />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-panel p-5 flex items-center justify-between h-full">
            <div>
              <div className="text-gray-500 text-sm mb-1">待審金額</div>
              <div className="text-2xl font-semibold text-gray-800">
                {backlogAmount.toLocaleString()} <span className="text-sm font-normal text-gray-400">TWD</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <ThunderboltOutlined className="text-xl text-amber-500" />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-panel p-5 flex items-center justify-between h-full">
            <div>
              <div className="text-gray-500 text-sm mb-1">平均等待</div>
              <div className="text-2xl font-semibold text-gray-800">
                {averagePendingAge} <span className="text-sm font-normal text-gray-400">天</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <FilterOutlined className="text-xl text-purple-500" />
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Main Content Area */}
        <Col xs={24} xl={17}>
          <div className="glass-panel p-6 space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-lg font-medium text-gray-800">
                <AuditOutlined /> 待審核清單
              </div>
              <Space wrap>
                <Input 
                  placeholder="搜尋項目..." 
                  prefix={<FileSearchOutlined className="text-gray-400" />} 
                  className="w-48"
                  allowClear
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <Select
                  placeholder="狀態"
                  className="w-32"
                  allowClear
                  mode="multiple"
                  maxTagCount="responsive"
                  defaultValue={['pending']}
                  onChange={(val) => setFilters(prev => ({ ...prev, statuses: val }))}
                  options={Object.entries(statusLabelMap).map(([value, label]) => ({ value, label }))}
                />
                <Button type="text" icon={<ReloadOutlined />} onClick={handleResetFilters}>重置</Button>
              </Space>
            </div>

            {/* Table */}
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filteredRequests}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 800 }}
              className="ant-table-modern"
            />
          </div>
        </Col>

        {/* Right Sidebar */}
        <Col xs={24} xl={7}>
          <div className="space-y-6">
            {/* Action Required Panel */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4 text-gray-800 font-medium">
                <FireOutlined className="text-red-500" /> 需優先處理
              </div>
              
              {urgentQueue.length === 0 && flaggedRequests.length === 0 ? (
                <Empty description="目前無急件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="space-y-3">
                  {urgentQueue.slice(0, 3).map(req => (
                    <div key={req.id} className="p-3 rounded-xl bg-red-50 border border-red-100 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-800 line-clamp-1">{req.reimbursementItem?.name}</span>
                        <Tag color="red" className="mr-0">急件</Tag>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-red-600 font-mono">${toNumber(req.amountOriginal).toLocaleString()}</span>
                        <Button 
                          size="small" 
                          type="link" 
                          className="text-red-500 p-0 h-auto"
                          onClick={() => navigate(`/ap/expenses?requestId=${req.id}`)}
                        >
                          處理
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {flaggedRequests.slice(0, 3).map(req => (
                    <div key={req.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-800 line-clamp-1">{req.reimbursementItem?.name}</span>
                        <Tag color="orange" className="mr-0">需注意</Tag>
                      </div>
                      <div className="text-xs text-amber-700">
                        {isOverdue(req) ? '已逾期' : '缺少 AI 建議'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        open={Boolean(actionState.request)}
        title={actionState.mode === 'approve' ? '快速核准' : '駁回申請'}
        onCancel={closeActionModal}
        onOk={handleActionSubmit}
        confirmLoading={actionLoading}
        okText={actionState.mode === 'approve' ? '核准' : '駁回'}
        okButtonProps={{ danger: actionState.mode === 'reject' }}
        centered
      >
        {!actionState.request ? null : actionState.mode === 'approve' ? (
          <Form form={actionForm} layout="vertical">
            <Alert 
              message={`即將核准：${actionState.request.reimbursementItem?.name}`}
              description={`金額：${toNumber(actionState.request.amountOriginal).toLocaleString()} TWD`}
              type="info"
              showIcon
              className="mb-4"
            />
            <Form.Item name="finalAccountId" label="最終會計科目">
              <Select
                allowClear
                placeholder="選擇科目 (選填)"
                loading={accountsLoading}
                options={accounts.map((account) => ({
                  label: `${account.code} ｜ ${account.name}`,
                  value: account.id,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="remark" label="核准備註">
              <Input.TextArea rows={3} placeholder="可填寫核准理由或注意事項" />
            </Form.Item>
          </Form>
        ) : (
          <Form form={actionForm} layout="vertical">
            <Alert 
              message="駁回後，申請人將收到通知並可重新編輯提交"
              type="warning"
              showIcon
              className="mb-4"
            />
            <Form.Item
              name="reason"
              label="駁回原因"
              rules={[{ required: true, message: '請輸入駁回原因' }]}
            >
              <Input.TextArea rows={3} placeholder="請輸入駁回原因" />
            </Form.Item>
            <Form.Item name="note" label="補充說明">
              <Input.TextArea rows={3} placeholder="可填寫需要申請人補齊的內容" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default ExpenseReviewCenterPage
