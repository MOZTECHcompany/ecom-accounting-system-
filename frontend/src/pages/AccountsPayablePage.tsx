import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Descriptions,
  Empty
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  BankOutlined,
  DollarOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassButton } from '../components/ui/GlassButton'
import { useAuth } from '../contexts/AuthContext'
import { expenseService, type ExpenseRequest } from '../services/expense.service'
import { bankingService } from '../services/banking.service'
import type { BankAccount } from '../types'
import { Link } from 'react-router-dom'

const { Title, Text } = Typography

const DEFAULT_ENTITY_ID = import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || 'tw-entity-001'

const AccountsPayablePage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = useMemo(
    () => (user?.roles ?? []).some((role) => role === 'SUPER_ADMIN' || role === 'ADMIN'),
    [user],
  )

  const [requests, setRequests] = useState<ExpenseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const entityId = DEFAULT_ENTITY_ID

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch approved requests
      const result = await expenseService.getExpenseRequests({ entityId, status: 'approved' })
      setRequests(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error(error)
      message.error('無法載入應付帳款資料')
    } finally {
      setLoading(false)
    }
  }, [entityId])

  const loadBanks = useCallback(async () => {
    try {
      const result = await bankingService.getAccounts()
      setBanks(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error(error)
      message.error('無法載入銀行帳戶資料')
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadRequests()
      loadBanks()
    }
  }, [isAdmin, loadRequests, loadBanks])

  const handleOpenPayment = (record: ExpenseRequest) => {
    setSelectedRequest(record)
    form.resetFields()
    setPaymentModalOpen(true)
  }

  const handlePaymentSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedRequest) return

      const selectedBank = banks.find(b => b.id === values.bankAccountId)
      if (!selectedBank) {
        message.error('請選擇付款銀行')
        return
      }

      setSubmitting(true)
      
      // Extract last 5 digits
      const accountNo = selectedBank.accountNo || ''
      const last5 = accountNo.length > 5 ? accountNo.slice(-5) : accountNo

      await expenseService.updatePaymentInfo(selectedRequest.id, {
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        paymentBankName: selectedBank.bankName,
        paymentAccountLast5: last5
      })

      message.success('付款成功')
      setPaymentModalOpen(false)
      loadRequests()
    } catch (error) {
      console.error(error)
      message.error('付款失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: '費用項目',
      dataIndex: ['reimbursementItem', 'name'],
      key: 'reimbursementItem',
      render: (text, record) => (
        <div className="flex flex-col">
          <span className="font-medium">{text || '--'}</span>
          <Text type="secondary" className="text-xs">{record.description}</Text>
        </div>
      )
    },
    {
      title: '申請人',
      dataIndex: ['creator', 'name'],
      key: 'creator',
    },
    {
      title: '金額',
      dataIndex: 'amountOriginal',
      key: 'amountOriginal',
      align: 'right',
      render: (val, record) => (
        <Text className="font-mono font-semibold">
          {record.amountCurrency} {Number(val).toLocaleString()}
        </Text>
      )
    },
    {
      title: '預計付款日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '--'
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          icon={<DollarOutlined />} 
          onClick={() => handleOpenPayment(record)}
          className="bg-green-600 hover:bg-green-500 border-none shadow-md"
        >
          付款
        </Button>
      )
    }
  ]

  if (!isAdmin) {
    return <div className="p-8 text-center">無權限存取此頁面</div>
  }

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out]">
      <div>
        <Title level={2} className="!mb-1 !font-light">應付帳款</Title>
        <Text className="text-gray-500">檢視已核准的費用單據並執行付款</Text>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={requests}
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="w-full"
        />
      </GlassCard>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <BankOutlined className="text-blue-600" />
            <span>執行付款</span>
          </div>
        }
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={handlePaymentSubmit}
        confirmLoading={submitting}
        okText="確認付款"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" className="pt-4">
          <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-100">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="費用項目">
                {selectedRequest?.reimbursementItem?.name}
              </Descriptions.Item>
              <Descriptions.Item label="付款金額">
                <span className="font-bold text-lg text-green-600">
                  {selectedRequest?.amountCurrency} {Number(selectedRequest?.amountOriginal).toLocaleString()}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Form.Item
            name="bankAccountId"
            label="出帳銀行帳戶"
            rules={[{ required: true, message: '請選擇出帳銀行' }]}
            extra={banks.length === 0 ? <Link to="/banking" className="text-blue-500">前往設定銀行帳戶</Link> : null}
          >
            <Select 
              placeholder="請選擇公司銀行帳戶"
              className="h-10"
              notFoundContent={
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="無可用銀行帳戶"
                >
                  <Link to="/banking"><Button type="link">新增銀行帳戶</Button></Link>
                </Empty>
              }
            >
              {banks.map(bank => (
                <Select.Option key={bank.id} value={bank.id}>
                  <div className="flex justify-between items-center">
                    <span>{bank.bankName}</span>
                    <span className="text-gray-400 text-xs">
                      {bank.accountNo}
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>• 系統將自動記錄銀行名稱與帳號末五碼</p>
            <p>• 付款後單據狀態將更新為「已付款」</p>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default AccountsPayablePage
