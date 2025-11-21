import React, { useState } from 'react'
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
  Select
} from 'antd'
import { 
  DownloadOutlined, 
  PrinterOutlined, 
  RiseOutlined, 
  FallOutlined,
  PieChartOutlined,
  BarChartOutlined,
  FileTextOutlined
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

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TabPane } = Tabs

// Mock Data
const PL_DATA = [
  { key: '1', category: '營業收入 (Revenue)', amount: 1250000, percentage: '100%' },
  { key: '2', category: '銷貨成本 (COGS)', amount: -450000, percentage: '36%' },
  { key: '3', category: '營業毛利 (Gross Profit)', amount: 800000, percentage: '64%', isTotal: true },
  { key: '4', category: '營業費用 (Operating Expenses)', amount: -320000, percentage: '25.6%' },
  { key: '5', category: '營業淨利 (Operating Income)', amount: 480000, percentage: '38.4%', isTotal: true },
  { key: '6', category: '業外收支 (Non-operating)', amount: 25000, percentage: '2%' },
  { key: '7', category: '稅前淨利 (Net Income Before Tax)', amount: 505000, percentage: '40.4%', isTotal: true },
]

const BALANCE_SHEET_DATA = [
  { key: '1', category: '流動資產 (Current Assets)', amount: 2500000 },
  { key: '2', category: '固定資產 (Fixed Assets)', amount: 1200000 },
  { key: '3', category: '資產總計 (Total Assets)', amount: 3700000, isTotal: true },
  { key: '4', category: '流動負債 (Current Liabilities)', amount: 800000 },
  { key: '5', category: '長期負債 (Long-term Liabilities)', amount: 1000000 },
  { key: '6', category: '股東權益 (Equity)', amount: 1900000 },
  { key: '7', category: '負債與權益總計', amount: 3700000, isTotal: true },
]

const SALES_TREND_DATA = [
  { month: 'Jan', sales: 4000, profit: 2400 },
  { month: 'Feb', sales: 3000, profit: 1398 },
  { month: 'Mar', sales: 2000, profit: 9800 },
  { month: 'Apr', sales: 2780, profit: 3908 },
  { month: 'May', sales: 1890, profit: 4800 },
  { month: 'Jun', sales: 2390, profit: 3800 },
  { month: 'Jul', sales: 3490, profit: 4300 },
]

const EXPENSE_DATA = [
  { name: '行銷費用', value: 400 },
  { name: '薪資支出', value: 300 },
  { name: '租金', value: 300 },
  { name: '雜項', value: 200 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  const columns = [
    {
      title: '項目',
      dataIndex: 'category',
      key: 'category',
      render: (text: string, record: any) => (
        <span className={record.isTotal ? 'font-bold text-gray-900' : 'text-gray-600'}>
          {text}
        </span>
      ),
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (value: number, record: any) => (
        <span className={record.isTotal ? 'font-bold text-gray-900' : value < 0 ? 'text-red-500' : 'text-gray-600'}>
          {value < 0 ? `(${Math.abs(value).toLocaleString()})` : value.toLocaleString()}
        </span>
      ),
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
          <RangePicker className="w-64" />
          <Button icon={<PrinterOutlined />}>列印</Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            loading={loading}
            onClick={handleExport}
            className="bg-black hover:!bg-gray-800"
          >
            匯出報表
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card p-6 min-h-[600px]">
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
                  <Table 
                    dataSource={PL_DATA} 
                    columns={columns} 
                    pagination={false} 
                    size="small"
                    rowClassName={(record) => record.isTotal ? 'bg-gray-50' : ''}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="資產負債表 (Balance Sheet)" bordered={false} className="shadow-sm">
                  <Table 
                    dataSource={BALANCE_SHEET_DATA} 
                    columns={columns.filter(c => c.key !== 'percentage')} 
                    pagination={false} 
                    size="small"
                    rowClassName={(record) => record.isTotal ? 'bg-gray-50' : ''}
                  />
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
            <Row gutter={[24, 24]}>
              <Col xs={24}>
                <Card bordered={false} className="shadow-sm mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <Title level={4} className="!m-0">月度銷售與利潤趨勢</Title>
                    <Select defaultValue="2025" style={{ width: 120 }} options={[{ value: '2025', label: '2025' }]} />
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={SALES_TREND_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="sales" name="銷售額" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="淨利" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
            </Row>
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
                  <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={EXPENSE_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label
                        >
                          {EXPENSE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="費用明細" bordered={false} className="shadow-sm h-full">
                  <Table 
                    dataSource={EXPENSE_DATA} 
                    columns={[
                      { title: '類別', dataIndex: 'name', key: 'name' },
                      { title: '金額', dataIndex: 'value', key: 'value', render: (val) => `$${val.toLocaleString()}` },
                      { title: '佔比', key: 'percent', render: (_, record) => `${((record.value / 1200) * 100).toFixed(1)}%` }
                    ]}
                    pagination={false}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </div>
    </div>
  )
}

export default ReportsPage