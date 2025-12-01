import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Drawer,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Upload,
  Statistic,
  Row,
  Col,
  Space
} from 'antd'
import { 
  BankOutlined, 
  HistoryOutlined, 
  PlusOutlined, 
  UploadOutlined,
  DollarOutlined,
  WalletOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { bankingService } from '../services/banking.service'
import { BankAccount, BankTransaction } from '../types'

const { Title, Text } = Typography

const AccountsTab = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const result = await bankingService.getAccounts()
      setAccounts(Array.isArray(result) ? result : [])
    } catch (error) {
      message.error('載入帳戶失敗')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    const totalAccounts = accounts.length
    return { totalBalance, totalAccounts }
  }, [accounts])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await bankingService.createAccount(values)
      message.success('帳戶建立成功')
      setDrawerOpen(false)
      form.resetFields()
      fetchAccounts()
    } catch (error) {
      // Error
    }
  }

  const columns = [
    { title: '銀行名稱', dataIndex: 'bankName', key: 'bankName' },
    { title: '帳號', dataIndex: 'accountNo', key: 'accountNo' },
    { title: '幣別', dataIndex: 'currency', key: 'currency' },
    {
      title: '餘額',
      dataIndex: 'balance',
      key: 'balance',
      render: (val?: number) => <Text strong>${(val ?? 0).toLocaleString()}</Text>,
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
      <Row gutter={16}>
        <Col span={12}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="總資產餘額 (預估)"
              value={stats.totalBalance}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="TWD"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="銀行帳戶數"
              value={stats.totalAccounts}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
          新增帳戶
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={accounts}
      />

      <Drawer
        title="新增銀行帳戶"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleCreate}>
              建立
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Card title="帳戶資訊" bordered={false} className="mb-4">
            <Form.Item name="bankName" label="銀行名稱" rules={[{ required: true }]}>
              <Input placeholder="例如：玉山銀行" />
            </Form.Item>
            <Form.Item name="accountNumber" label="帳號" rules={[{ required: true }]}>
              <Input placeholder="例如：123-456-789" />
            </Form.Item>
          </Card>
          
          <Card title="設定" bordered={false}>
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
          </Card>
        </Form>
      </Drawer>
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
      dataIndex: 'txnDate',
      key: 'txnDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    { title: '摘要', dataIndex: 'descriptionRaw', key: 'descriptionRaw' },
    {
      title: '金額',
      dataIndex: 'amountOriginal',
      key: 'amountOriginal',
      render: (val: number, record: BankTransaction) => (
        <Text type={val >= 0 ? 'success' : 'danger'}>
          {val >= 0 ? '+' : ''}{Math.abs(val).toLocaleString()} {record.amountCurrency}
        </Text>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'reconcileStatus',
      key: 'reconcileStatus',
      render: (status: string) => {
        const isMatched = status?.toLowerCase() === 'matched'
        return <Tag color={isMatched ? 'green' : 'orange'}>{isMatched ? '已調節' : '未調節'}</Tag>
      },
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
