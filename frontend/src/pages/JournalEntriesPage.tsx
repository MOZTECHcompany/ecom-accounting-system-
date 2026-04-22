import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { CheckCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  accountingService,
  AccountingPeriod,
  JournalEntry,
} from '../services/accounting.service'

const { Title, Text } = Typography

const JournalEntriesPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [periodId, setPeriodId] = useState<string | undefined>()
  const [searchText, setSearchText] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  const loadData = async (nextPeriodId?: string) => {
    setLoading(true)
    try {
      const [periodRows, journalRows, accountRows] = await Promise.all([
        accountingService.getPeriods(),
        accountingService.getJournals(undefined, nextPeriodId),
        accountingService.getAccounts(),
      ])
      setPeriods(periodRows)
      setJournals(journalRows)
      setAccounts(accountRows.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
      })))
    } catch (error: any) {
      message.error(error?.response?.data?.message || '載入會計分錄失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(periodId)
  }, [periodId])

  const handleApprove = async (journalEntryId: string) => {
    setApprovingId(journalEntryId)
    try {
      await accountingService.approveJournal(journalEntryId)
      message.success('分錄已審核')
      await loadData(periodId)
    } catch (error: any) {
      message.error(error?.response?.data?.message || '分錄審核失敗')
    } finally {
      setApprovingId(null)
    }
  }

  const filtered = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) {
      return journals
    }
    return journals.filter((journal) => {
      const haystacks = [
        journal.description,
        journal.sourceModule || '',
        journal.sourceId || '',
        ...journal.journalLines.map((line) => `${line.account.code} ${line.account.name} ${line.memo || ''}`),
      ]
      return haystacks.some((text) => text.toLowerCase().includes(keyword))
    })
  }, [journals, searchText])

  const handleCreateManual = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      await accountingService.createManualJournal({
        date: values.date,
        description: values.description,
        lines: values.lines.map((line: any) => ({
          accountId: line.accountId,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          memo: line.memo,
        })),
      })
      message.success('手動分錄已建立')
      setCreateOpen(false)
      form.resetFields()
      await loadData(periodId)
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      message.error(error?.response?.data?.message || '建立分錄失敗')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} className="!text-gray-800 font-light tracking-tight !mb-1">
            會計分錄
          </Title>
          <Text className="text-gray-500">
            查看系統已產生的營收、撥款、薪資與人工分錄，確認每筆交易是否已落帳。
          </Text>
        </div>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            手動分錄
          </Button>
          <Select
            allowClear
            placeholder="依會計期間篩選"
            className="min-w-[220px]"
            value={periodId}
            onChange={(value) => setPeriodId(value)}
            options={periods.map((period) => ({
              label: `${period.name} · ${period.status}`,
              value: period.id,
            }))}
          />
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="搜尋描述、來源模組、科目"
            className="min-w-[280px]"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Tag
            color="blue"
            className="cursor-pointer rounded-full px-3 py-1"
            onClick={() => loadData(periodId)}
          >
            <ReloadOutlined /> 重新整理
          </Tag>
        </Space>
      </div>

      <Card className="glass-card !border-0">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          expandable={{
            expandedRowRender: (record) => (
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 text-sm font-medium text-slate-700">分錄明細</div>
                <div className="space-y-2">
                  {record.journalLines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-[160px_minmax(0,1fr)_120px_120px] gap-3 rounded-xl bg-white px-4 py-3 text-sm"
                    >
                      <div className="font-mono text-slate-600">
                        {line.account.code} {line.account.name}
                      </div>
                      <div className="text-slate-500">{line.memo || '—'}</div>
                      <div className="text-right text-emerald-700">
                        {Number(line.debit || 0).toLocaleString()}
                      </div>
                      <div className="text-right text-rose-700">
                        {Number(line.credit || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          }}
          columns={[
            {
              title: '日期',
              dataIndex: 'date',
              key: 'date',
              render: (value: string) => dayjs(value).format('YYYY/MM/DD'),
              width: 120,
            },
            {
              title: '描述',
              dataIndex: 'description',
              key: 'description',
            },
            {
              title: '來源',
              key: 'source',
              width: 180,
              render: (_, record: JournalEntry) => (
                <div className="text-xs text-slate-500">
                  <div>{record.sourceModule || 'manual'}</div>
                  <div className="font-mono">{record.sourceId || '—'}</div>
                </div>
              ),
            },
            {
              title: '狀態',
              key: 'status',
              width: 120,
              render: (_, record: JournalEntry) => (
                <Tag color={record.approvedAt ? 'green' : 'gold'}>
                  {record.approvedAt ? '已審核' : '草稿'}
                </Tag>
              ),
            },
            {
              title: '借貸合計',
              key: 'amount',
              width: 160,
              align: 'right',
              render: (_, record: JournalEntry) => {
                const total = record.journalLines.reduce(
                  (sum, line) => sum + Number(line.debit || 0),
                  0,
                )
                return <span className="font-mono">{total.toLocaleString()}</span>
              },
            },
            {
              title: '操作',
              key: 'actions',
              width: 130,
              render: (_, record: JournalEntry) =>
                record.approvedAt ? (
                  <Tag color="green">已完成</Tag>
                ) : (
                  <Button
                    type="link"
                    icon={<CheckCircleOutlined />}
                    loading={approvingId === record.id}
                    onClick={() => handleApprove(record.id)}
                  >
                    審核分錄
                  </Button>
                ),
            },
          ]}
          pagination={{ pageSize: 12, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="建立手動分錄"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreateManual}
        okText="建立分錄"
        confirmLoading={creating}
        width={760}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs().format('YYYY-MM-DD'),
            lines: [{ debit: 0, credit: 0 }, { debit: 0, credit: 0 }],
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item name="date" label="分錄日期" rules={[{ required: true, message: '請輸入日期' }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '請輸入描述' }]}
            >
              <Input placeholder="例如：月底調整分錄" />
            </Form.Item>
          </div>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.key} className="grid grid-cols-12 gap-3 rounded-xl bg-slate-50 p-3">
                    <Form.Item
                      {...field}
                      name={[field.name, 'accountId']}
                      label={index === 0 ? '科目' : ''}
                      className="col-span-4 mb-0"
                      rules={[{ required: true, message: '請選擇科目' }]}
                    >
                      <Select
                        showSearch
                        options={accounts.map((account) => ({
                          value: account.id,
                          label: `${account.code} ${account.name}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'debit']}
                      label={index === 0 ? '借方' : ''}
                      className="col-span-2 mb-0"
                    >
                      <InputNumber min={0} precision={2} className="w-full" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'credit']}
                      label={index === 0 ? '貸方' : ''}
                      className="col-span-2 mb-0"
                    >
                      <InputNumber min={0} precision={2} className="w-full" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'memo']}
                      label={index === 0 ? '摘要' : ''}
                      className="col-span-3 mb-0"
                    >
                      <Input placeholder="可選" />
                    </Form.Item>
                    <div className="col-span-1 flex items-end">
                      {fields.length > 2 ? (
                        <Button danger type="link" onClick={() => remove(field.name)}>
                          刪除
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <Button onClick={() => add({ debit: 0, credit: 0 })}>新增分錄明細</Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

export default JournalEntriesPage
