import React, { useState, useEffect } from 'react'
import { Row, Col, Statistic, Typography, Tag, Button, Timeline, Card, Avatar } from 'antd'
import { 
  DollarOutlined, 
  ShoppingOutlined, 
  BankOutlined, 
  FileTextOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import FinancialHealthWidget from '../components/FinancialHealthWidget'
import PageSkeleton from '../components/PageSkeleton'
import AIInsightsWidget from '../components/AIInsightsWidget'

const { Title, Text } = Typography

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  
  // Living Data State
  const [revenue, setRevenue] = useState(128930)
  const [receivables, setReceivables] = useState(456780)
  const [expenses, setExpenses] = useState(234000)
  const [pendingDocs, setPendingDocs] = useState(15)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Living Data Simulation
  useEffect(() => {
    if (loading) return

    const interval = setInterval(() => {
      const rand = Math.random()
      
      if (rand < 0.3) {
        setRevenue(prev => prev + Math.floor(Math.random() * 500))
        setLastUpdated('revenue')
      } else if (rand < 0.5) {
        setReceivables(prev => prev + Math.floor(Math.random() * 200))
        setLastUpdated('receivables')
      } else if (rand < 0.7) {
        setExpenses(prev => prev + Math.floor(Math.random() * 150))
        setLastUpdated('expenses')
      } else {
        // Occasionally change pending docs
        if (Math.random() > 0.5) {
             setPendingDocs(prev => prev + (Math.random() > 0.5 ? 1 : -1))
             setLastUpdated('pendingDocs')
        }
      }

      // Reset highlight after animation
      setTimeout(() => setLastUpdated(null), 1000)
    }, 2500)

    return () => clearInterval(interval)
  }, [loading])

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* AI Insights Widget */}
      <AIInsightsWidget />

      <div className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Title level={2} className="!text-gray-800 font-light tracking-tight !mb-0">
              Dashboard
            </Title>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-green"></div>
              <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Live Updates</span>
            </div>
          </div>
          <Text className="text-gray-500">
            歡迎回來，管理員。這是您今天的財務健康概況。
          </Text>
        </div>
        <div className="text-right hidden sm:block">
          <Text className="text-gray-400 text-xs">System Status: Operational</Text>
        </div>
      </div>
      
      {/* Key Metrics Cards */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '0ms' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center backdrop-blur-sm">
                <DollarOutlined className="text-blue-500 text-xl" />
              </div>
              <Tag color="green" className="m-0 rounded-full border-none bg-green-500/10 text-green-600 px-3 py-1">
                +12.5%
              </Tag>
            </div>
            <Statistic
              title={<span className="label-text font-medium">今日銷售額</span>}
              value={revenue}
              prefix="$"
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'revenue' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              最近 7 天: $892,100
            </div>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center backdrop-blur-sm">
                <BankOutlined className="text-orange-500 text-xl" />
              </div>
              <Tag color="red" className="m-0 rounded-full border-none bg-red-500/10 text-red-600 px-3 py-1">
                12 筆逾期
              </Tag>
            </div>
            <Statistic
              title={<span className="label-text font-medium">未收款應收帳款</span>}
              value={receivables}
              prefix="$"
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'receivables' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              逾期金額: <span className="text-red-500">$125,000</span>
            </div>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center backdrop-blur-sm">
                <ShoppingOutlined className="text-purple-500 text-xl" />
              </div>
            </div>
            <Statistic
              title={<span className="label-text font-medium">本月費用總額</span>}
              value={expenses}
              prefix="$"
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'expenses' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              預算達成率: <span className="text-blue-500">85%</span>
            </div>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '300ms' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center backdrop-blur-sm">
                <FileTextOutlined className="text-teal-500 text-xl" />
              </div>
              <Tag color="blue" className="m-0 rounded-full border-none bg-blue-500/10 text-blue-600 px-3 py-1">
                3 筆待簽
              </Tag>
            </div>
            <Statistic
              title={<span className="label-text font-medium">待處理單據</span>}
              value={pendingDocs}
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'pendingDocs' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              包含發票與報銷單
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Financial Health Widget */}
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <FinancialHealthWidget />
      </div>

      {/* Recent Activity & Tasks */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <div className="h-full animate-slide-up" style={{ animationDelay: '500ms' }}>
            <Card title="近期活動 (Recent Activity)" className="glass-card !border-0 h-full">
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">收到來自 Tech Solutions 的款項</div>
                        <div className="text-xs text-gray-400">2025-11-21 10:30 AM • NT$ 150,000</div>
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">開立發票 #INV-2025089</div>
                        <div className="text-xs text-gray-400">2025-11-21 09:15 AM • 給 Global Trade Co.</div>
                      </div>
                    ),
                  },
                  {
                    color: 'red',
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">庫存警示：MacBook Pro M3</div>
                        <div className="text-xs text-gray-400">2025-11-20 16:45 PM • 庫存低於安全水位</div>
                      </div>
                    ),
                  },
                  {
                    color: 'gray',
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">系統自動備份完成</div>
                        <div className="text-xs text-gray-400">2025-11-20 03:00 AM</div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="h-full animate-slide-up" style={{ animationDelay: '600ms' }}>
            <Card title="待辦事項 (Pending Tasks)" className="glass-card !border-0 h-full">
              <div className="space-y-4">
                {[
                  { title: '審核 11 月份行銷費用報銷', user: 'Alice', time: '2h ago', tag: 'Approval' },
                  { title: '確認 Q4 財務預測報告', user: 'Bob', time: '4h ago', tag: 'Review' },
                  { title: '更新供應商合約條款', user: 'Charlie', time: '1d ago', tag: 'Legal' },
                ].map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Avatar style={{ backgroundColor: idx === 0 ? '#f56a00' : idx === 1 ? '#7265e6' : '#ffbf00' }} icon={<UserOutlined />} />
                      <div>
                        <div className="font-medium text-gray-800">{task.title}</div>
                        <div className="text-xs text-gray-400">{task.user} • {task.time}</div>
                      </div>
                    </div>
                    <Tag>{task.tag}</Tag>
                  </div>
                ))}
                <Button type="dashed" block className="mt-4">查看更多待辦</Button>
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
