import React from 'react'
import { Row, Col, Statistic, Typography, Tag, Button } from 'antd'
import { 
  DollarOutlined, 
  ShoppingOutlined, 
  BankOutlined, 
  FileTextOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const { Title, Text } = Typography

const DashboardPage: React.FC = () => {
  // Mock Data
  const upcomingPayments = [
    { id: 1, title: 'AWS 伺服器費用', amount: 12000, date: '2025-11-25', status: 'pending' },
    { id: 2, title: '辦公室租金', amount: 45000, date: '2025-12-01', status: 'pending' },
    { id: 3, title: '供應商貨款 - ABC Corp', amount: 156000, date: '2025-12-05', status: 'urgent' },
  ]

  const chartData = [
    { name: '11/15', value: 4000 },
    { name: '11/16', value: 3000 },
    { name: '11/17', value: 2000 },
    { name: '11/18', value: 2780 },
    { name: '11/19', value: 1890 },
    { name: '11/20', value: 2390 },
    { name: '11/21', value: 3490 },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Title level={2} className="!text-gray-800 font-light tracking-tight">
          Dashboard
        </Title>
        <Text className="text-gray-500">
          歡迎回來，管理員。這是您今天的營運概況。
        </Text>
      </div>
      
      {/* Key Metrics */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <DollarOutlined className="text-blue-500 text-lg" />
              </div>
              <Tag color="green" className="m-0 rounded-full border-none bg-green-50 text-green-600 px-2">
                +12.5%
              </Tag>
            </div>
            <Statistic
              title={<span className="text-gray-500 text-sm">今日銷售額</span>}
              value={128930}
              prefix="$"
              valueStyle={{ color: '#1d1d1f', fontWeight: 600, fontSize: '24px' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              最近 7 天: $892,100
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <BankOutlined className="text-orange-500 text-lg" />
              </div>
              <Tag color="red" className="m-0 rounded-full border-none bg-red-50 text-red-600 px-2">
                12 筆逾期
              </Tag>
            </div>
            <Statistic
              title={<span className="text-gray-500 text-sm">未收款應收帳款</span>}
              value={456780}
              prefix="$"
              valueStyle={{ color: '#1d1d1f', fontWeight: 600, fontSize: '24px' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              逾期金額: <span className="text-red-500">$125,000</span>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <ShoppingOutlined className="text-purple-500 text-lg" />
              </div>
            </div>
            <Statistic
              title={<span className="text-gray-500 text-sm">本月費用總額</span>}
              value={234000}
              prefix="$"
              valueStyle={{ color: '#1d1d1f', fontWeight: 600, fontSize: '24px' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              較上月增加 5.2%
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                <ClockCircleOutlined className="text-cyan-500 text-lg" />
              </div>
              <Tag color="blue" className="m-0 rounded-full border-none bg-blue-50 text-blue-600 px-2">
                3 筆即將到期
              </Tag>
            </div>
            <Statistic
              title={<span className="text-gray-500 text-sm">待付款提醒</span>}
              value={3}
              suffix="筆"
              valueStyle={{ color: '#1d1d1f', fontWeight: 600, fontSize: '24px' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              總金額: $213,000
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Chart Section */}
        <Col xs={24} lg={16}>
          <div className="glass-card p-6 h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <Title level={4} className="!text-gray-800 !m-0 font-medium">營收趨勢</Title>
              <div className="flex gap-2">
                <Tag className="rounded-full px-3 cursor-pointer hover:bg-gray-100 border-none">週</Tag>
                <Tag className="rounded-full px-3 cursor-pointer bg-black text-white border-none">月</Tag>
                <Tag className="rounded-full px-3 cursor-pointer hover:bg-gray-100 border-none">年</Tag>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007aff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#007aff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#007aff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* Upcoming Payments / Notifications */}
        <Col xs={24} lg={8}>
          <div className="glass-card p-6 h-full">
            <Title level={4} className="!text-gray-800 mb-6 font-medium">即將到期付款</Title>
            <div className="space-y-4">
              {upcomingPayments.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60 hover:bg-white/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'urgent' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      <FileTextOutlined />
                    </div>
                    <div>
                      <div className="text-gray-800 font-medium group-hover:text-blue-600 transition-colors">{item.title}</div>
                      <div className="text-gray-400 text-xs">{item.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">${item.amount.toLocaleString()}</div>
                    <div className={`text-[10px] ${item.status === 'urgent' ? 'text-red-500' : 'text-blue-500'}`}>
                      {item.status === 'urgent' ? '急件' : '待處理'}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 text-center">
                <Button type="link" className="text-gray-500 hover:text-blue-600">
                  查看全部付款 {'>'}
                </Button>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
