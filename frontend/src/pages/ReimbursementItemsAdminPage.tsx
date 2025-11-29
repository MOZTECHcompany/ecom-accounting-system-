import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { expenseService } from '../services/expense.service'
import type {
  ApprovalPolicySummary,
  ReimbursementItem,
  UpsertReimbursementItemPayload,
} from '../services/expense.service'
import { accountingService } from '../services/accounting.service'
import type { Account } from '../types'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'
const ROLE_OPTIONS = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'OPERATOR']
const RECEIPT_TYPES = ['TAX_INVOICE', 'RECEIPT', 'BANK_SLIP', 'INTERNAL_ONLY']

const toList = (value?: string | null) =>
  value
    ? value
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
    : []

const ReimbursementItemsAdminPage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.roles?.some((role) => role === 'SUPER_ADMIN' || role === 'ADMIN')
  const [form] = Form.useForm()
  const [entityId, setEntityId] = useState(DEFAULT_ENTITY_ID)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [items, setItems] = useState<ReimbursementItem[]>([])
  const [policies, setPolicies] = useState<ApprovalPolicySummary[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<ReimbursementItem | null>(null)

  const fetchItems = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const data = await expenseService.listReimbursementItemsAdmin({
        entityId,
        includeInactive,
      })
      setItems(data)
    } catch (error) {
      console.error(error)
      message.error('無法載入報銷項目，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [entityId, includeInactive])

  const fetchSupportingData = useCallback(async () => {
    if (!entityId) return
    try {
      const [policyList, accountList] = await Promise.all([
        expenseService.listApprovalPolicies(entityId),
        accountingService.getAccounts(entityId),
      ])
      setPolicies(policyList)
      setAccounts(accountList)
    } catch (error) {
      console.error(error)
      message.error('載入審批政策或會計科目失敗')
    }
  }, [entityId])

  useEffect(() => {
    if (!isAdmin) return
    fetchItems()
  }, [fetchItems, isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    fetchSupportingData()
  }, [fetchSupportingData, isAdmin])

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setEditingItem(null)
    form.resetFields()
  }

  const handleCreate = () => {
    setEditingItem(null)
    form.setFieldsValue({
      entityId,
      name: '',
      accountId: undefined,
      description: '',
      keywords: [],
      amountLimit: undefined,
      requiresDepartmentHead: false,
      approverRoleCodes: [],
      approvalPolicyId: undefined,
      defaultReceiptType: undefined,
      allowedRoles: [],
      allowedDepartments: [],
      allowedReceiptTypes: [],
      isActive: true,
    })
    setDrawerOpen(true)
  }

  const handleEdit = useCallback(
    (item: ReimbursementItem) => {
      setEditingItem(item)
      form.setFieldsValue({
        entityId: item.entityId,
        name: item.name,
        accountId: item.accountId,
        description: item.description ?? '',
        keywords: toList(item.keywords),
        amountLimit: item.amountLimit ? Number(item.amountLimit) : undefined,
        requiresDepartmentHead: item.requiresDepartmentHead ?? false,
        approverRoleCodes: toList(item.approverRoleCodes),
        approvalPolicyId: item.approvalPolicy?.id ?? item.approvalPolicyId ?? undefined,
        defaultReceiptType: item.defaultReceiptType ?? undefined,
        allowedRoles: toList(item.allowedRoles),
        allowedDepartments: toList(item.allowedDepartments),
        allowedReceiptTypes: toList(item.allowedReceiptTypes),
        isActive: item.isActive ?? true,
      })
      setDrawerOpen(true)
    },
    [form],
  )

  const normalizeListInput = (values?: string[]) =>
    values?.map((value) => value.trim()).filter((value) => value.length)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload: UpsertReimbursementItemPayload = {
        entityId: values.entityId?.trim(),
        name: values.name.trim(),
        accountId: values.accountId,
        description: values.description?.trim() || undefined,
        keywords: normalizeListInput(values.keywords),
        amountLimit:
          typeof values.amountLimit === 'number' ? Number(values.amountLimit) : undefined,
        requiresDepartmentHead: values.requiresDepartmentHead,
        approverRoleCodes: normalizeListInput(values.approverRoleCodes),
        approvalPolicyId: values.approvalPolicyId || undefined,
        defaultReceiptType: values.defaultReceiptType || undefined,
        allowedRoles: normalizeListInput(values.allowedRoles),
        allowedDepartments: normalizeListInput(values.allowedDepartments),
        allowedReceiptTypes: normalizeListInput(values.allowedReceiptTypes),
        isActive: values.isActive,
      }

      if (editingItem) {
        await expenseService.updateReimbursementItemAdmin(editingItem.id, payload)
        message.success('報銷項目已更新')
      } else {
        await expenseService.createReimbursementItemAdmin(payload)
        message.success('報銷項目已建立')
      }
      await fetchItems()
      handleDrawerClose()
    } catch (error) {
      if ((error as any)?.errorFields) {
        return
      }
      console.error(error)
      message.error('保存失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = useCallback(
    async (item: ReimbursementItem) => {
      try {
        await expenseService.archiveReimbursementItemAdmin(item.id)
        message.success('已停用該報銷項目')
        await fetchItems()
      } catch (error) {
        console.error(error)
        message.error('停用失敗')
      }
    },
    [fetchItems],
  )

  const columns: ColumnsType<ReimbursementItem> = useMemo(
    () => [
      {
        title: '名稱',
        dataIndex: 'name',
        render: (value, record) => (
          <Space direction="vertical" size={0}>
            <span className="font-medium">{value}</span>
            <span className="text-xs text-gray-500">{record.description}</span>
          </Space>
        ),
      },
      {
        title: '會計科目',
        dataIndex: 'accountId',
        render: (_, record) => (
          <div>
            <div>{record.account?.name ?? '—'}</div>
            <span className="text-xs text-gray-500">{record.account?.code}</span>
          </div>
        ),
      },
      {
        title: '審批政策',
        dataIndex: 'approvalPolicyId',
        render: (_, record) => (
          <div>
            {record.approvalPolicy?.id ? (
              <Tag color="processing">{record.approvalPolicy?.id}</Tag>
            ) : (
              <Tag>未綁定</Tag>
            )}
            {record.requiresDepartmentHead && <Tag color="purple">需部門主管</Tag>}
          </div>
        ),
      },
      {
        title: '關鍵字',
        dataIndex: 'keywords',
        render: (value) =>
          value ? (
            <Space size={[0, 4]} wrap>
              {toList(value).map((keyword) => (
                <Tag key={keyword}>{keyword}</Tag>
              ))}
            </Space>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        title: '限制',
        dataIndex: 'amountLimit',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <span>
              金額上限：{record.amountLimit ? Number(record.amountLimit).toLocaleString() : '無'}
            </span>
            <span className="text-xs text-gray-500">
              允許角色：{record.allowedRoles ? toList(record.allowedRoles).join(', ') : '未限制'}
            </span>
          </Space>
        ),
      },
      {
        title: '狀態',
        dataIndex: 'isActive',
        render: (value) => (
          <Tag color={value ? 'green' : 'red'}>{value ? '啟用' : '停用'}</Tag>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Tooltip title="編輯">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            {record.isActive && (
              <Tooltip title="停用">
                <Button
                  type="text"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => handleArchive(record)}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [handleEdit, handleArchive],
  )

  if (!isAdmin) {
    return (
      <Card className="glass-panel">
        <Alert
          message="權限不足"
          description="此頁面僅限系統管理員或超級管理員存取。"
          type="error"
          showIcon
        />
      </Card>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card className="glass-panel" bordered={false}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <label className="text-sm text-gray-500 block mb-1">實體 ID</label>
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} />
          </Col>
          <Col xs={12} md={4}>
            <label className="text-sm text-gray-500 block mb-1">顯示停用</label>
            <Switch checked={includeInactive} onChange={setIncludeInactive} />
          </Col>
          <Col xs={12} md={12} className="text-right">
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={fetchItems}>
                重新整理
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增報銷項目
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="glass-panel" bordered={false}>
        <Table<ReimbursementItem>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          locale={{ emptyText: <Empty description="尚無資料" /> }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title={editingItem ? '編輯報銷項目' : '新增報銷項目'}
        placement="right"
        width={520}
        onClose={handleDrawerClose}
        open={drawerOpen}
        destroyOnClose
        footer={
          <Space className="w-full justify-end">
            <Button onClick={handleDrawerClose}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              儲存
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form} preserve={false}>
          <Form.Item
            label="實體 ID"
            name="entityId"
            rules={[{ required: true, message: '請輸入實體 ID' }]}
          >
            <Input placeholder="例如：tw-entity-001" />
          </Form.Item>

          <Form.Item
            label="報銷項目名稱"
            name="name"
            rules={[{ required: true, message: '請輸入名稱' }]}
          >
            <Input maxLength={80} />
          </Form.Item>

          <Form.Item
            label="對應會計科目"
            name="accountId"
            rules={[{ required: true, message: '請選擇會計科目' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="選擇會計科目"
              options={accounts.map((account) => ({
                label: `${account.code} ｜ ${account.name}`,
                value: account.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} maxLength={200} placeholder="可選" />
          </Form.Item>

          <Form.Item label="關鍵字" name="keywords">
            <Select mode="tags" tokenSeparators={[',']} placeholder="輸入後按 Enter 新增" />
          </Form.Item>

          <Form.Item label="金額上限 (TWD)" name="amountLimit">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="留空則不限" />
          </Form.Item>

          <Form.Item
            label="預設憑證類型"
            name="defaultReceiptType"
          >
            <Select allowClear options={RECEIPT_TYPES.map((type) => ({ label: type, value: type }))} />
          </Form.Item>

          <Form.Item label="允許的憑證類型" name="allowedReceiptTypes">
            <Select
              mode="multiple"
              allowClear
              options={RECEIPT_TYPES.map((type) => ({ label: type, value: type }))}
            />
          </Form.Item>

          <Form.Item label="需要部門主管核准" name="requiresDepartmentHead" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="審批角色代碼" name="approverRoleCodes">
            <Select
              mode="multiple"
              allowClear
              options={ROLE_OPTIONS.map((role) => ({ label: role, value: role }))}
            />
          </Form.Item>

          <Form.Item label="綁定審批政策" name="approvalPolicyId">
            <Select
              allowClear
              placeholder="選擇審批政策"
              options={policies.map((policy) => ({ label: policy.name, value: policy.id }))}
            />
          </Form.Item>

          <Divider />

          <Form.Item label="允許的角色" name="allowedRoles">
            <Select
              mode="multiple"
              allowClear
              options={ROLE_OPTIONS.map((role) => ({ label: role, value: role }))}
            />
          </Form.Item>

          <Form.Item label="允許的部門 ID" name="allowedDepartments">
            <Select mode="tags" tokenSeparators={[',']} placeholder="輸入部門 ID" />
          </Form.Item>

          <Form.Item label="啟用" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default ReimbursementItemsAdminPage
