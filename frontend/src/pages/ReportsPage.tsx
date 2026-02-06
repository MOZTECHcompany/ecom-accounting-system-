import React, { useState, useEffect } from 'react'
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  DatePicker, 
  Button, 
  Tabs, 
  Table, 
  Tag, 
  Statistic,
  Space,
  Select,
  message,
  Empty,
  Spin,
  Modal,
  Descriptions,
} from 'antd'
import { 
  DownloadOutlined, 
  PrinterOutlined, 
  RiseOutlined, 
  FallOutlined,
  PieChartOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RobotOutlined
} from '@ant-design/icons'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { accountingService, IncomeStatement, BalanceSheet, ReportItem } from '../services/accounting.service'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TabPane } = Tabs

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

interface ReportRow {
  key: string
  category: string
  amount: number | null
  percentage?: string
  type?: string
  isHeader?: boolean
  isTotal?: boolean
  isNet?: boolean
}

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('year'), dayjs()])
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null)

  // AI State
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const fetchData = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return
    setLoading(true)
    try {
      const [start, end] = dateRange
      const [isData, bsData] = await Promise.all([
        accountingService.getIncomeStatement(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
        accountingService.getBalanceSheet(end.format('YYYY-MM-DD'))
      ])
      setIncomeStatement(isData)
      setBalanceSheet(bsData)
    } catch (error) {
      console.error(error)
      message.error('無法載入報表數據')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const handleExport = () => {
    message.info('匯出功能開發中')
  }

  const handleAIAnalysis = async () => {
    if (!incomeStatement) return
    setAiModalVisible(true)
    setAiLoading(true)
    try {
      const result = await accountingService.analyzeReport({
        entityId: 'tw-entity-001', // Should come from a selector in real app
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        context: 'Income Statement Review'
      })
      setAiResult(result)
    } catch (error) {
      message.error('AI Analysis failed')
    } finally {
      setAiLoading(false)
    }
  }

  // Transform Income Statement Data
  const getPLData = (): ReportRow[] => {
    if (!incomeStatement) return []
    const totalRev = incomeStatement.totalRevenue || 1 // Avoid division by zero
    
    const revenues: ReportRow[] = incomeStatement.revenues.map(r => ({
      key: r.code,
      category: r.name,
      amount: r.amount,
      percentage: `${((r.amount / totalRev) * 100).toFixed(1)}%`,
      type: 'revenue'
    }))

    const expenses: ReportRow[] = incomeStatement.expenses.map(e => ({
      key: e.code,
      category: e.name,
      amount: e.amount, // Keep positive for display, but logic knows it's expense
      percentage: `${((e.amount / totalRev) * 100).toFixed(1)}%`,
      type: 'expense'
    }))

    return [
      { key: 'header_rev', category: '營業收入 (Revenue)', amount: null, isHeader: true },
      ...revenues,
      { key: 'total_rev', category: '總收入', amount: incomeStatement.totalRevenue, isTotal: true },
      { key: 'header_exp', category: '營業費用 (Expenses)', amount: null, isHeader: true },
      ...expenses,
      { key: 'total_exp', category: '總費用', amount: incomeStatement.totalExpense, isTotal: true },
      { key: 'net_income', category: '淨利 (Net Income)', amount: incomeStatement.netIncome, isTotal: true, isNet: true }
    ]
  }

  // Transform Balance Sheet Data
  const getBSData = (): ReportRow[] => {
    if (!balanceSheet) return []
    
    const assets = balanceSheet.assets.map(a => ({ ...a, type: 'asset' }))
    const liabilities = balanceSheet.liabilities.map(l => ({ ...l, type: 'liability' }))
    const equity = balanceSheet.equity.map(e => ({ ...e, type: 'equity' }))

    return [
      { key: 'header_asset', category: '資產 (Assets)', amount: null, isHeader: true },
      ...assets.map(a => ({ key: a.code, category: a.name, amount: a.amount })),
      { key: 'total_asset', category: '資產總計', amount: balanceSheet.totalAssets, isTotal: true },
      
      { key: 'header_liab', category: '負債 (Liabilities)', amount: null, isHeader: true },
      ...liabilities.map(l => ({ key: l.code, category: l.name, amount: l.amount })),
      { key: 'total_liab', category: '負債總計', amount: balanceSheet.totalLiabilities, isTotal: true },
      
      { key: 'header_equity', category: '權益 (Equity)', amount: null, isHeader: true },
      ...equity.map(e => ({ key: e.code, category: e.name, amount: e.amount })),
      { key: 'retained_earnings', category: '本期損益 (Retained Earnings)', amount: balanceSheet.calculatedRetainedEarnings },
      { key: 'total_equity', category: '權益總計', amount: balanceSheet.totalEquity + balanceSheet.calculatedRetainedEarnings, isTotal: true },
      
      { key: 'total_liab_equity', category: '負債與權益總計', amount: balanceSheet.totalLiabilities + balanceSheet.totalEquity + balanceSheet.calculatedRetainedEarnings, isTotal: true, isNet: true }
    ]
  }

  // Expense Analysis Data
  const getExpenseData = () => {
    if (!incomeStatement) return []
    return incomeStatement.expenses.map(e => ({
      name: e.name,
      value: e.amount
    })).sort((a, b) => b.value - a.value)
  }

  const columns = [
    {
      title: '項目',
      dataIndex: 'category',
      key: 'category',
      render: (text: string, record: any) => (
        <span className={`
          ${record.isTotal ? 'font-bold text-gray-900' : 'text-gray-600'}
          ${record.isHeader ? 'font-bold text-blue-600 mt-4 block' : ''}
          ${record.isNet ? 'text-lg' : ''}
        `}>
          {text}
        </span>
      ),
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (value: number | null, record: any) => {
        if (value === null) return null
        return (
          <span className={`
            ${record.isTotal ? 'font-bold text-gray-900' : 'text-gray-600'}
            ${record.isNet ? 'text-lg text-blue-600' : ''}
          `}>
            {value < 0 ? `(${Math.abs(value).toLocaleString()})` : value.toLocaleString()}
          </span>
        )
      },
    },
    {
      title: '百分比',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right' as const,
      render: (text: string) => <span className="text-gray-500">{text}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={2} className="!text-gray-800 font-light tracking-tight !mb-1">
            報表中心 (Reports Center)
          </Title>
          <Text className="text-gray-500">
            查看與分析您的財務狀況、銷售績效與營運指標。
          </Text>
        </div>
        <div className="flex gap-3">
          <RangePicker 
            className="w-64" 
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>重新整理</Button>
          <Button 
            icon={<RobotOutlined />} 
            onClick={handleAIAnalysis} 
            loading={aiLoading}
            className="border-purple-500 text-purple-600 hover:text-purple-700 hover:border-purple-600"
          >
            AI 財務分析
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            className="bg-black hover:!bg-gray-800"
          >
            匯出報表
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card p-6 min-h-[600px]">
        <Spin spinning={loading}>
          <Tabs defaultActiveKey="1" type="card" size="large" className="custom-tabs">
            
            {/* Tab 1: Financial Statements */}
            <TabPane 
              tab={
                <span className="flex items-center gap-2">
                  <FileTextOutlined />
                  財務報表
                </span>
              } 
              key="1"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Card title="損益表 (Profit & Loss)" bordered={false} className="shadow-sm">
                    {incomeStatement ? (
                      <Table 
                        dataSource={getPLData()} 
                        columns={columns} 
                        pagination={false} 
                        size="small"
                        rowClassName={(record) => record.isTotal ? 'bg-gray-50' : ''}
                      />
                    ) : <Empty description="無資料" />}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="資產負債表 (Balance Sheet)" bordered={false} className="shadow-sm">
                    {balanceSheet ? (
                      <Table 
                        dataSource={getBSData()} 
                        columns={columns.filter(c => c.key !== 'percentage')} 
                        pagination={false} 
                        size="small"
                        rowClassName={(record) => record.isTotal ? 'bg-gray-50' : ''}
                      />
                    ) : <Empty description="無資料" />}
                  </Card>
                </Col>
              </Row>
            </TabPane>

            {/* Tab 2: Sales Analysis */}
            <TabPane 
              tab={
                <span className="flex items-center gap-2">
                  <BarChartOutlined />
                  銷售分析
                </span>
              } 
              key="2"
            >
              <div className="p-8 text-center text-gray-500">
                <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>銷售趨勢分析功能即將推出</p>
                <p className="text-xs">目前請參考損益表中的收入明細</p>
              </div>
            </TabPane>

            {/* Tab 3: Expense Analysis */}
            <TabPane 
              tab={
                <span className="flex items-center gap-2">
                  <PieChartOutlined />
                  費用分析
                </span>
              } 
              key="3"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Card title="費用類別佔比" bordered={false} className="shadow-sm h-full">
                    {getExpenseData().length > 0 ? (
                      <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getExpenseData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label
                            >
                              {getExpenseData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <Empty description="無費用資料" />}
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="費用明細" bordered={false} className="shadow-sm h-full">
                    <Table 
                      dataSource={getExpenseData()} 
                      columns={[
                        { title: '類別', dataIndex: 'name', key: 'name' },
                        { title: '金額', dataIndex: 'value', key: 'value', render: (val) => `$${val.toLocaleString()}` },
                        { 
                          title: '佔比', 
                          key: 'percent', 
                          render: (_, record) => {
                            const total = incomeStatement?.totalExpense || 1
                            return `${((record.value / total) * 100).toFixed(1)}%`
                          } 
                        }
                      ]}
                      pagination={false}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Spin>
      </div>

      <Modal
        title={<span><RobotOutlined className="text-purple-600 mr-2" /> AI 財務分析報告 (Expense Intelligence)</span>}
        open={aiModalVisible}
        onCancel={() => setAiModalVisible(false)}
        footer={null}
        width={800}
      >
        {aiLoading ? (
           <div className="flex flex-col items-center justify-center py-12">
             <Spin size="large" />
             <Text className="mt-4 text-gray-500">正在分析財務數據...</Text>
           </div>
        ) : aiResult ? (
          <div className="space-y-6">
             {aiResult.analysis === 'AI service not configured.' && (
               <div className="bg-orange-50 p-4 rounded text-orange-700">
                 請聯繫管理員配置 GEMINI_API_KEY 以啟用 AI 功能。
               </div>
             )}
             
             {aiResult.insights && (
               <Card size="small" title="📊 關鍵洞察 (Insights)" className="border-purple-100">
                  <Text>{aiResult.insights}</Text>
               </Card>
             )}

             {aiResult.anomalies && (
               <Card size="small" title="⚠️ 異常偵測 (Anomalies)" className="border-red-100">
                  <Text>{aiResult.anomalies}</Text>
               </Card>
             )}

             {aiResult.suggestions && (
               <Card size="small" title="💡 優化建議 (Suggestions)" className="border-green-100">
                  <Text>{aiResult.suggestions}</Text>
               </Card>
             )}

             {/* Fallback for raw text response */}
             {!aiResult.insights && !aiResult.analysis && (
               <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded text-sm">
                 {JSON.stringify(aiResult, null, 2)}
               </pre>
             )}
          </div>
        ) : (
          <Empty description="點擊分析按鈕以生成報告" />
        )}
      </Modal>
    </div>
  )
}

export default ReportsPage