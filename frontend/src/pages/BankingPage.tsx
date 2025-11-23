import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Upload,
  Statistic,
  Row,
  Col
} from 'antd'
import { 
  BankOutlined, 
  HistoryOutlined, 
  PlusOutlined, 
  UploadOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { bankingService } from '../services/banking.service'
import { BankAccount, BankTransaction } from '../types'

const { Title, Text } = Typography

const AccountsTab = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const result = await bankingService.getAccounts()
      setAccounts(result)
    } catch (error) {
      message.error('載入帳戶失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await bankingService.createAccount(values)
      message.success('帳戶建立成功')
      setCreateOpen(false)
      form.resetFields()
      fetchAccounts()
    } catch (error) {
      // Error
    }
  }

  const columns = [
    { title: '銀行名稱', dataIndex: 'bankName', key: 'bankName' },
    { title: '帳號', dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: '幣別', dataIndex: 'currency', key: 'currency' },
    { 
      title: '餘額', 
      dataIndex: 'balance', 
      key: 'balance',
      render: (val: number) => <Text strong>${val.toLocaleString()}</Text>
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '啟用' : '停用'}</Tag>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={4} className="!mb-0 !font-light">銀行帳戶列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新增帳戶
        </Button>
      </div>

      <Row gutter={16}>
        {accounts.map(acc => (
          <Col span={8} key={acc.id}>
            <Card className="glass-card mb-4">
              <Statistic
                title={acc.bankName}
                value={acc.balance}
                precision={2}
                prefix={<DollarOutlined />}
                suffix={acc.currency}
              />
              <Text type="secondary">{acc.accountNumber}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={accounts}
      />

      <Modal
        title="新增銀行帳戶"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="bankName" label="銀行名稱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="accountNumber" label="帳號" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="currency" label="幣別" initialValue="TWD">
            <Select>
              <Select.Option value="TWD">TWD</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="glAccountId" label="對應會計科目">
            <Input placeholder="例如: 1101" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

const TransactionsTab = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const result = await bankingService.getTransactions()
      setTransactions(result.items)
    } catch (error) {
      message.error('載入交易失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const columns = [
    { 
      title: '日期', 
      dataIndex: 'transactionDate', 
      key: 'transactionDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    { title: '摘要', dataIndex: 'description', key: 'description' },
    { 
      title: '金額', 
      dataIndex: 'amount', 
      key: 'amount',
      render: (val: number) => (
        <Text type={val >= 0 ? 'success' : 'danger'}>
          {val > 0 ? '+' : ''}{val.toLocaleString()}
        </Text>
      )
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'RECONCILED' ? 'green' : 'orange'}>
          {status === 'RECONCILED' ? '已調節' : '未調節'}
        </Tag>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={4} className="!mb-0 !font-light">交易明細</Title>
        <Upload>
          <Button icon={<UploadOutlined />}>匯入對帳單</Button>
        </Upload>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={transactions}
      />
    </div>
  )
}

const BankingPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <Title level={2} className="!mb-1 !font-light">銀行與資金</Title>
        <Text className="text-gray-500">管理銀行帳戶與資金流向</Text>
      </div>

      <Card className="glass-card" bordered={false}>
        <Tabs
          defaultActiveKey="accounts"
          items={[
            {
              key: 'accounts',
              label: (
                <span>
                  <BankOutlined />
                  銀行帳戶
                </span>
              ),
              children: <AccountsTab />,
            },
            {
              key: 'transactions',
              label: (
                <span>
                  <HistoryOutlined />
                  交易明細
                </span>
              ),
              children: <TransactionsTab />,
            },
          ]}
        />
      </Card>
    </motion.div>
  )
}

export default BankingPage
