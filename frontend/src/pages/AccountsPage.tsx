import React, { useEffect, useState } from 'react'
import { Table, Tag, message, Space, Button, Typography, Input } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { accountingService } from '../services/accounting.service'
import { Account } from '../types'

const { Title, Text } = Typography

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

  const typeLabelMap: Record<string, string> = {
    ASSET: '資產',
    LIABILITY: '負債',
    EQUITY: '權益',
    REVENUE: '收入',
    EXPENSE: '費用',
  }

  const columns = [
    {
      title: '科目代碼',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => <span className="font-mono text-gray-600">{text}</span>
    },
    {
      title: '科目名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>
    },
    {
      title: '英文名稱',
      dataIndex: 'nameEn',
      key: 'nameEn',
      className: 'text-gray-500'
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
        return (
          <Tag color={colorMap[type] || 'default'} className="rounded-full px-2 border-none">
            {typeLabelMap[type] || type}
          </Tag>
        )
      },
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      className: 'text-gray-500'
    },
    {
      title: '餘額',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      align: 'right' as const,
      render: (balance: number | undefined, record: Account) => {
        const safeBalance = typeof balance === 'number' ? balance : 0
        const currency = record.currency || 'TWD'
        return (
          <span className="font-mono font-medium">
            {safeBalance.toLocaleString()} <span className="text-xs text-gray-400">{currency}</span>
          </span>
        )
      },
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'} className="rounded-full border-none">
          {isActive ? '啟用' : '停用'}
        </Tag>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} className="!text-gray-800 font-light tracking-tight !mb-1">
            會計科目表
          </Title>
          <Text className="text-gray-500">
            管理您的會計科目表與餘額
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadAccounts} className="hover:bg-gray-50">
            重新載入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} className="bg-black hover:!bg-gray-800 border-none shadow-lg shadow-gray-200">
            新增科目
          </Button>
        </Space>
      </div>

      <div className="glass-card p-6">
        <div className="mb-4 max-w-md">
          <Input 
            prefix={<SearchOutlined className="text-gray-400" />} 
            placeholder="搜尋科目代碼或名稱..." 
            className="rounded-full bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 focus:bg-white transition-all"
          />
        </div>
        
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ 
            pageSize: 20,
            showSizeChanger: true,
            className: 'p-4'
          }}
          className="ant-table-glass"
        />
      </div>
    </div>
  )
}

export default AccountsPage
