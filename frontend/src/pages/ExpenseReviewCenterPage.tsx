import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
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
  Timeline,
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
  BulbOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassDrawer, GlassDrawerSection } from '../components/ui/GlassDrawer'
import { GlassButton } from '../components/ui/GlassButton'
import { GlassInput } from '../components/ui/GlassInput'
import { GlassSelect } from '../components/ui/GlassSelect'
import { useAuth } from '../contexts/AuthContext'
import {
  expenseService,
  type ExpenseRequest,
  type ExpenseHistoryEntry,
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

const historyLabelMap: Record<string, string> = {
  submitted: '已提交',
  approved: '核准',
  rejected: '駁回',
  pending: '審核中',
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

  // Detail Drawer State
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)
  const [history, setHistory] = useState<ExpenseHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [reviewAccountId, setReviewAccountId] = useState<string | undefined>(undefined)
  const [reviewRemark, setReviewRemark] = useState<string>('')

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

  const aiCoverage = useMemo(() => {
    if (!requests.length) return 0
    const withSuggestions = requests.filter((request) => request.suggestedAccount).length
    return Math.round((withSuggestions / requests.length) * 100)
  }, [requests])

  const handleOpenDetail = async (request: ExpenseRequest) => {
    setSelectedRequest(request)
    setDetailDrawerOpen(true)
    setHistoryLoading(true)
    try {
      const historyData = await expenseService.getExpenseRequestHistory(request.id)
      setHistory(historyData)
    } catch (error) {
      console.error(error)
      message.error('無法載入歷程紀錄')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false)
    setSelectedRequest(null)
    setHistory([])
  }

  useEffect(() => {
    if (selectedRequest) {
      setReviewAccountId(selectedRequest.suggestedAccount?.id || selectedRequest.finalAccount?.id)
      setReviewRemark('')
    }
  }, [selectedRequest])

  const handleDirectApprove = async () => {
    if (!selectedRequest || !reviewAccountId) return
    try {
      setActionLoading(true)
      await expenseService.approveExpenseRequest(selectedRequest.id, {
        finalAccountId: reviewAccountId,
        remark: reviewRemark.trim() || undefined,
      })
      message.success('已核准申請')
      handleCloseDetail()
      void loadRequests()
    } catch (error) {
      console.error(error)
      message.error('核准失敗，請稍後再試')
    } finally {
      setActionLoading(false)
    }
  }

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
      title: '費用項目',
      dataIndex: 'reimbursementItem',
      key: 'reimbursementItem',
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <span className="font-medium text-gray-800">
            {record.reimbursementItem?.name || '—'}
          </span>
          {record.description && (
            <Text type="secondary" className="text-xs text-gray-500">
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '金額',
      dataIndex: 'amountOriginal',
      key: 'amountOriginal',
      render: (_value, record) => (
        <Text className="font-mono">
          {(record.amountCurrency || 'TWD') + ' ' + toNumber(record.amountOriginal).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={statusColorMap[value] || 'default'}>
          {statusLabelMap[value] || value}
        </Tag>
      ),
    },
    {
      title: '付款 / 優先度',
      key: 'priority',
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            {record.priority && (
              <Tag color={record.priority === 'urgent' ? 'red' : 'default'}>
                {record.priority === 'urgent' ? '急件' : '一般'}
              </Tag>
            )}
            {record.dueDate && (
              <Tag color={isOverdue(record) ? 'red' : 'blue'}>
                到期 {dayjs(record.dueDate).format('MM/DD')}
              </Tag>
            )}
          </Space>
          {record.paymentStatus && (
            <Text type="secondary" className="text-xs">
              付款狀態：{record.paymentStatus}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'AI 建議',
      key: 'ai',
      render: (_value, record) => {
        if (!record.suggestedAccount) {
          return <Tag bordered={false}>—</Tag>
        }
        const confidence = Number(record.suggestionConfidence ?? 0)
        return (
          <Space direction="vertical" size={0}>
            <Space size={4}>
              <Tag color="blue" bordered={false}>
                {record.suggestedAccount.code}
              </Tag>
              <Text>{record.suggestedAccount.name}</Text>
            </Space>
            <Text type="secondary" className="text-xs">
              信心 {(confidence * 100).toFixed(0)}%
            </Text>
          </Space>
        )
      },
    },
    {
      title: '等待天數',
      key: 'aging',
      render: (_value, record) => (
        <Text>{dayjs().diff(dayjs(record.createdAt), 'day')} 天</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_value, record) => (
        <div className="flex flex-col gap-2">
          {record.status === 'pending' && (
            <Button
              type="primary"
              block
              size="small"
              className="!bg-green-600/85 !backdrop-blur-md !border-green-400/30 !text-white !shadow-md hover:!bg-green-600/95 hover:!shadow-lg transition-all duration-300 flex items-center justify-center gap-1"
              onClick={() => handleOpenDetail(record)}
            >
              <CheckCircleOutlined /> 審核
            </Button>
          )}
          <div className="flex justify-between items-center gap-1">
            <Button
              type="text"
              size="small"
              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 flex-1 flex items-center justify-center gap-1"
              onClick={() => handleOpenDetail(record)}
            >
              <FileSearchOutlined /> 詳情
            </Button>
            {record.status === 'pending' && (
              <Button
                type="text"
                danger
                size="small"
                className="flex-1 flex items-center justify-center gap-1 hover:bg-red-50"
                onClick={() => openActionModal('reject', record)}
              >
                <CloseCircleOutlined /> 駁回
              </Button>
            )}
          </div>
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
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">
            費用審核中心
          </h1>
          <p className="text-slate-500 text-sm">
            集中檢視所有待審核費用、設定優先順序並進行快速核准或駁回。
          </p>
        </div>
        <div className="flex gap-3">
          <GlassButton onClick={() => navigate('/ap/expenses')} className="flex items-center gap-2">
            <FileSearchOutlined /> 回到費用申請
          </GlassButton>
          <GlassButton onClick={() => void loadRequests()} isLoading={loading} className="flex items-center gap-2">
            <ReloadOutlined /> 重新整理
          </GlassButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AuditOutlined className="text-6xl text-blue-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">待審件數</div>
          <div className="text-3xl font-semibold text-blue-600 mb-1">
            {pendingRequests.length} <span className="text-sm font-normal text-slate-400">件</span>
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FireOutlined className="text-6xl text-red-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">急件</div>
          <div className="text-3xl font-semibold text-red-600 mb-1">
            {urgentQueue.length} <span className="text-sm font-normal text-slate-400">件</span>
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ThunderboltOutlined className="text-6xl text-amber-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">待審金額 (TWD)</div>
          <div className="text-3xl font-semibold text-amber-600 mb-1">
            {backlogAmount.toLocaleString()}
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <WarningOutlined className="text-6xl text-purple-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">平均等待天數</div>
          <div className="text-3xl font-semibold text-purple-600 mb-1">
            {averagePendingAge} <span className="text-sm font-normal text-slate-400">天</span>
          </div>
        </GlassCard>
      </div>

      {/* Filter Section */}
      <GlassCard className="w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <FilterOutlined /> 審核篩選
          </div>
          <Button type="link" onClick={handleResetFilters} className="text-slate-500 hover:text-blue-600 px-0">
            清除篩選
          </Button>
        </div>
        
        <Form
          layout="vertical"
          form={filterForm}
          onValuesChange={handleFiltersChange}
          initialValues={createDefaultFilters()}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Form.Item name="search" label="關鍵字" className="mb-0">
              <Input allowClear placeholder="輸入描述或報銷項目" prefix={<FileSearchOutlined className="text-slate-400" />} className="rounded-xl" />
            </Form.Item>
            
            <Form.Item name="statuses" label="狀態" initialValue={['pending']} className="mb-0">
              <Select
                mode="multiple"
                allowClear
                placeholder="選擇狀態"
                options={Object.entries(statusLabelMap).map(([value, label]) => ({
                  value,
                  label,
                }))}
                className="rounded-xl"
              />
            </Form.Item>
            
            <Form.Item name="dateRange" label="申請期間" className="mb-0">
              <RangePicker className="w-full rounded-xl" />
            </Form.Item>
            
            <Form.Item name="payeeType" label="受款人" initialValue="all" className="mb-0">
              <Select
                options={[
                  { label: '全部', value: 'all' },
                  { label: '員工', value: 'employee' },
                  { label: '廠商', value: 'vendor' },
                ]}
                className="rounded-xl"
              />
            </Form.Item>
            
            <Form.Item name="priority" label="優先度" initialValue="all" className="mb-0">
              <Select
                options={[
                  { label: '全部', value: 'all' },
                  { label: '一般', value: 'normal' },
                  { label: '急件', value: 'urgent' },
                ]}
                className="rounded-xl"
              />
            </Form.Item>
            
            <Form.Item name="minAmount" label="最低金額" className="mb-0">
              <InputNumber className="w-full rounded-xl" min={0} placeholder="金額下限" />
            </Form.Item>
          </div>
        </Form>
      </GlassCard>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 w-full">
        {/* Left Column: Review List */}
        <GlassCard className="w-full p-0 overflow-hidden h-fit">
          <div className="p-6 border-b border-white/20 flex justify-between items-center bg-white/10">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">待審核清單</h3>
              <p className="text-slate-500 text-sm mt-1">符合目前篩選的 {filteredRequests.length} 筆申請</p>
            </div>
            <Tooltip title="透過 AI 建議覆蓋率掌握模型使用情況">
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">AI 建議覆蓋率</div>
                <Progress percent={aiCoverage} size="small" style={{ width: 120 }} strokeColor="#3b82f6" />
              </div>
            </Tooltip>
          </div>
          
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredRequests}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            rowClassName={(record) => (isUrgentRequest(record) ? 'bg-red-50/30' : 'hover:bg-white/20 transition-colors')}
            locale={{ emptyText: <Empty description="沒有符合條件的申請" /> }}
            className="w-full"
          />
        </GlassCard>

        {/* Right Column: Urgent & Attention */}
        <div className="flex flex-col gap-6">
          <GlassCard className="w-full p-0 overflow-hidden">
            <div className="p-4 border-b border-white/20 bg-red-50/30 flex items-center gap-2">
              <FireOutlined className="text-red-500" />
              <span className="font-medium text-red-700">急件提醒</span>
            </div>
            <div className="p-4">
              {urgentQueue.length === 0 ? (
                <Empty description="目前沒有急件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="flex flex-col gap-3">
                  {urgentQueue.slice(0, 4).map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-white/40 rounded-xl border border-red-100 hover:border-red-200 transition-all hover:shadow-sm cursor-pointer"
                      onClick={() => handleOpenDetail(request)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-slate-800 line-clamp-1">
                          {request.reimbursementItem?.name || '未分類'}
                        </span>
                        <span className="font-mono font-medium text-red-600 whitespace-nowrap ml-2">
                          ${toNumber(request.amountOriginal).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-red-600 bg-red-100/50 px-2 py-0.5 rounded-full">
                          到期：{request.dueDate ? dayjs(request.dueDate).format('MM/DD') : '未設定'}
                        </span>
                        <span className="text-blue-500">詳情 &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="w-full p-0 overflow-hidden">
            <div className="p-4 border-b border-white/20 bg-amber-50/30 flex items-center gap-2">
              <WarningOutlined className="text-amber-500" />
              <span className="font-medium text-amber-700">需注意 / 補件</span>
            </div>
            <div className="p-4">
              {flaggedRequests.length === 0 ? (
                <Empty description="目前沒有需要補件的申請" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="flex flex-col gap-3">
                  {flaggedRequests.slice(0, 4).map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-white/40 rounded-xl border border-amber-100 hover:border-amber-200 transition-all hover:shadow-sm cursor-pointer"
                      onClick={() => handleOpenDetail(request)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-slate-800 line-clamp-1">
                          {request.reimbursementItem?.name || '未分類'}
                        </span>
                        <span className="text-amber-600 text-xs bg-amber-100/50 px-2 py-0.5 rounded-full">處理</span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1 mt-2">
                        {isOverdue(request) && (
                          <div className="flex items-center gap-1 text-red-500">
                            <WarningOutlined /> 已逾期 {dayjs().diff(dayjs(request.dueDate), 'day')} 天
                          </div>
                        )}
                        {!request.suggestedAccount && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <WarningOutlined /> 缺少 AI 科目建議
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassDrawer
        title="申請詳情"
        placement="right"
        onClose={handleCloseDetail}
        open={detailDrawerOpen}
        width={420}
        destroyOnClose
      >
        {!selectedRequest ? (
          <Text type="secondary" className="p-6 block">請選擇申請查看詳情</Text>
        ) : (
          <div className="space-y-4">
            <GlassDrawerSection>
              <Descriptions bordered column={1} size="small" labelStyle={{ width: 100, background: 'transparent' }} contentStyle={{ background: 'transparent' }}>
                <Descriptions.Item label="報銷項目">
                  {selectedRequest.reimbursementItem?.name || '--'}
                </Descriptions.Item>
                <Descriptions.Item label="金額">
                  {selectedRequest.amountCurrency || 'TWD'} {toNumber(selectedRequest.amountOriginal).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="狀態">
                  <Tag color={statusColorMap[selectedRequest.status] || 'default'} className="rounded-full px-2 border-none">
                    {statusLabelMap[selectedRequest.status] || selectedRequest.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="會計科目">
                  {selectedRequest.status === 'pending' ? (
                    <div className="space-y-2 py-1">
                      <Select
                        value={reviewAccountId}
                        onChange={setReviewAccountId}
                        options={accounts.map((account) => ({
                          label: `${account.code} ｜ ${account.name}`,
                          value: account.id,
                        }))}
                        showSearch
                        optionFilterProp="label"
                        placeholder="選擇會計科目"
                        className="w-full"
                        status={!reviewAccountId ? 'error' : undefined}
                      />
                      {selectedRequest.suggestedAccount && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <BulbOutlined className="text-yellow-500" />
                          AI 建議: {selectedRequest.suggestedAccount.code} {selectedRequest.suggestedAccount.name}
                          {selectedRequest.suggestionConfidence && (
                            <span className="text-slate-400">
                              (信心 {(Number(selectedRequest.suggestionConfidence) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>
                      {selectedRequest.finalAccount
                        ? `${selectedRequest.finalAccount.code} · ${selectedRequest.finalAccount.name}`
                        : selectedRequest.suggestedAccount
                        ? `${selectedRequest.suggestedAccount.code} · ${selectedRequest.suggestedAccount.name}`
                        : '未指定'}
                    </span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="備註">
                  {selectedRequest.description || <Text type="secondary">—</Text>}
                </Descriptions.Item>
              </Descriptions>
            </GlassDrawerSection>

            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">歷程紀錄</div>
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
                          <span className="font-bold text-slate-700">
                            {historyLabelMap[entry.action] || entry.action}
                          </span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {dayjs(entry.createdAt).format('YYYY/MM/DD HH:mm')}
                          </span>
                        </div>
                        {entry.actor && (
                          <div className="text-xs text-slate-500 mt-1">由 {entry.actor.name}</div>
                        )}
                        {entry.note && (
                          <div className="text-sm mt-2 text-slate-600 break-words whitespace-pre-wrap leading-relaxed p-2 bg-white/40 rounded-md border border-white/20">
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
            </GlassDrawerSection>

            {selectedRequest.status === 'pending' && (
              <GlassDrawerSection>
                <div className="flex gap-3">
                  <Button
                    block
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      handleCloseDetail()
                      openActionModal('reject', selectedRequest)
                    }}
                    className="rounded-full"
                  >
                    駁回
                  </Button>
                  <Button
                    block
                    type="primary"
                    className="!bg-green-600/85 !backdrop-blur-md !border-green-400/30 !text-white !shadow-md hover:!bg-green-600/95 hover:!shadow-lg transition-all duration-300 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    icon={<CheckCircleOutlined />}
                    onClick={handleDirectApprove}
                    disabled={!reviewAccountId}
                    loading={actionLoading}
                  >
                    核准
                  </Button>
                </div>
              </GlassDrawerSection>
            )}
          </div>
        )}
      </GlassDrawer>

      <Modal
        open={Boolean(actionState.request)}
        title={actionState.mode === 'approve' ? '快速核准' : '駁回申請'}
        onCancel={closeActionModal}
        onOk={handleActionSubmit}
        confirmLoading={actionLoading}
        okText={actionState.mode === 'approve' ? '核准' : '駁回'}
        okButtonProps={{
          danger: actionState.mode === 'reject',
          className:
            actionState.mode === 'approve'
              ? '!bg-green-600/85 !backdrop-blur-md !border-green-400/30 !text-white !shadow-md hover:!bg-green-600/95 hover:!shadow-lg transition-all duration-300'
              : undefined,
        }}
      >
        {!actionState.request ? null : actionState.mode === 'approve' ? (
          <Form form={actionForm} layout="vertical">
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
