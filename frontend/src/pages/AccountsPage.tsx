import React, { useEffect, useState } from 'react'
import { Table, Card, Tag, message, Space, Button } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { accountingService } from '../services/accounting.service'
import { Account } from '../types'

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await accountingService.getAccounts()
      setAccounts(data)
    } catch (error: any) {
      message.error(error.response?.data?.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const columns = [
    {
      title: '科目代碼',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '科目名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '英文名稱',
      dataIndex: 'nameEn',
      key: 'nameEn',
    },
    {
      title: '類別',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          ASSET: 'blue',
          LIABILITY: 'orange',
          EQUITY: 'green',
          REVENUE: 'cyan',
          EXPENSE: 'red',
        }
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>
      },
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      width: 150,
    },
    {
      title: '餘額',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right' as const,
      render: (balance: number, record: Account) => (
        <span>
          {balance.toLocaleString()} {record.currency}
        </span>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>{isActive ? '啟用' : '停用'}</Tag>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="會計科目表"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAccounts}>
              重新載入
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              新增科目
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={accounts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

export default AccountsPage
