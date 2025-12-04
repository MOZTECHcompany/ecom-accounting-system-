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

  const aiCoverage = useMemo(() => {
    if (!requests.length) return 0
    const withSuggestions = requests.filter((request) => request.suggestedAccount).length
    return Math.round((withSuggestions / requests.length) * 100)
  }, [requests])

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
      fixed: 'right',
      width: 140,
      render: (_value, record) => (
        <Space direction="vertical" size={8} className="w-full">
          <Button
            size="small"
            block
            icon={<FileSearchOutlined />}
            onClick={() => navigate(`/ap/expenses?requestId=${record.id}`)}
          >
            詳情
          </Button>
          {record.status === 'pending' && (
            <div className="flex gap-2">
              <Tooltip title="快速核准">
                <Button
                  className="flex-1 bg-green-500 hover:!bg-green-600 border-green-500 hover:!border-green-600 text-white"
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => openActionModal('approve', record)}
                />
              </Tooltip>
              <Tooltip title="駁回申請">
                <Button
                  className="flex-1"
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => openActionModal('reject', record)}
                />
              </Tooltip>
            </div>
          )}
        </Space>
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Title level={2} className="!mb-1 !font-light">
            費用審核中心
          </Title>
          <Text className="text-gray-500">
            集中檢視所有待審核費用、設定優先順序並進行快速核准或駁回。
          </Text>
        </div>
        <Space wrap>
          <Button icon={<FileSearchOutlined />} onClick={() => navigate('/ap/expenses')}>
            回到費用申請
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void loadRequests()} loading={loading}>
            重新整理
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow h-full">
            <Statistic
              title="待審件數"
              value={pendingRequests.length}
              prefix={<AuditOutlined className="text-blue-500" />}
              suffix="件"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow h-full">
            <Statistic
              title="急件"
              value={urgentQueue.length}
              prefix={<FireOutlined className="text-red-500" />}
              suffix="件"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow h-full">
            <Statistic
              title="待審金額 (TWD)"
              value={backlogAmount}
              precision={0}
              prefix={<ThunderboltOutlined className="text-amber-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow h-full">
            <Statistic
              title="平均等待天數"
              value={averagePendingAge}
              suffix="天"
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        className="shadow-sm"
        title={
          <Space>
            <FilterOutlined /> 審核篩選
          </Space>
        }
        extra={
          <Button type="link" onClick={handleResetFilters}>
            清除篩選
          </Button>
        }
      >
        <Form
          layout="vertical"
          form={filterForm}
          onValuesChange={handleFiltersChange}
          initialValues={createDefaultFilters()}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="search" label="關鍵字">
                <Input allowClear placeholder="輸入描述或報銷項目" prefix={<FileSearchOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="statuses" label="狀態" initialValue={['pending']}>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="選擇狀態"
                  options={Object.entries(statusLabelMap).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="dateRange" label="申請期間">
                <RangePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="payeeType" label="受款人" initialValue="all">
                <Select
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '員工', value: 'employee' },
                    { label: '廠商', value: 'vendor' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="priority" label="優先度" initialValue="all">
                <Select
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '一般', value: 'normal' },
                    { label: '急件', value: 'urgent' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="minAmount" label="最低金額">
                <InputNumber className="w-full" min={0} placeholder="金額下限" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="maxAmount" label="最高金額">
                <InputNumber className="w-full" min={0} placeholder="金額上限" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false} className="shadow-sm" bodyStyle={{ paddingTop: 12 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Title level={4} className="!mb-0">
                  待審核清單
                </Title>
                <Text type="secondary">符合目前篩選的 {filteredRequests.length} 筆申請</Text>
              </div>
              <Tooltip title="透過 AI 建議覆蓋率掌握模型使用情況">
                <div className="text-right">
                  <Text type="secondary">AI 建議覆蓋率</Text>
                  <Progress percent={aiCoverage} size="small" style={{ width: 160 }} />
                </div>
              </Tooltip>
            </div>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filteredRequests}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 960 }}
              rowClassName={(record) => (isUrgentRequest(record) ? 'bg-red-50/70' : '')}
              locale={{ emptyText: <Empty description="沒有符合條件的申請" /> }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Space direction="vertical" size={16} className="w-full">
            <Card
              bordered={false}
              className="shadow-sm"
              title={
                <Space>
                  <FireOutlined className="text-red-500" /> 急件提醒
                </Space>
              }
              bodyStyle={{ minHeight: 180 }}
            >
              {urgentQueue.length === 0 ? (
                <Empty description="目前沒有急件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="flex flex-col gap-3">
                  {urgentQueue.slice(0, 4).map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-red-50 rounded-lg border border-red-100 hover:border-red-200 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {request.reimbursementItem?.name || '未分類'}
                        </span>
                        <span className="font-mono font-medium text-red-600 whitespace-nowrap ml-2">
                          ${toNumber(request.amountOriginal).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-red-500 bg-red-100/50 px-1.5 py-0.5 rounded">
                          到期：{request.dueDate ? dayjs(request.dueDate).format('MM/DD') : '未設定'}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          className="!p-0 h-auto"
                          onClick={() => navigate(`/ap/expenses?requestId=${request.id}`)}
                        >
                          詳情
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              bordered={false}
              className="shadow-sm"
              title={
                <Space>
                  <WarningOutlined className="text-amber-500" /> 需注意/補件
                </Space>
              }
            >
              {flaggedRequests.length === 0 ? (
                <Empty description="目前沒有需要補件的申請" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="flex flex-col gap-3">
                  {flaggedRequests.slice(0, 4).map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-amber-50 rounded-lg border border-amber-100 hover:border-amber-200 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {request.reimbursementItem?.name || '未分類'}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          className="!p-0 h-auto text-amber-600"
                          onClick={() => navigate(`/ap/expenses?requestId=${request.id}`)}
                        >
                          處理
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
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
            </Card>
          </Space>
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
