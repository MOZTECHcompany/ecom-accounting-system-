import React, { useState, useEffect } from 'react'
import { Row, Col, Statistic, Typography, Tag, Button, Timeline, Card, Avatar, message } from 'antd'
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
import { shopifyService } from '../services/shopify.service'

const { Title, Text } = Typography

const DASHBOARD_TZ = 'Asia/Taipei'

// Build today range in a target timezone and return UTC ISO strings
function getTodayRangeInTimezone(timezone: string) {
  const now = new Date()

  // Extract Y/M/D and current H/M/S in target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  const hour = getPart('hour')
  const minute = getPart('minute')
  const second = getPart('second')

  // Offset in ms between target TZ wall-clock and UTC at this moment
  const localMillis = Date.UTC(year, month - 1, day, hour, minute, second)
  const offsetMs = localMillis - now.getTime()

  // Local midnight in target TZ expressed in UTC: subtract the offset from UTC midnight
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs
  const endUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs

  return {
    since: new Date(startUtcMs).toISOString(),
    until: new Date(endUtcMs).toISOString(),
  }
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true)

  // Live Data State (from API)
  const [revenue, setRevenue] = useState(0)
  const [receivables, setReceivables] = useState(0)
  const [expenses, setExpenses] = useState(0)
  const [pendingDocs, setPendingDocs] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    // Constrain summary to "today" in the dashboard timezone (Asia/Taipei)
    const { since, until } = getTodayRangeInTimezone(DASHBOARD_TZ)
    const storedEntityId = localStorage.getItem('entityId')?.trim()

    const fetchSummary = async () => {
      try {
        const summary = await shopifyService.summary({
          entityId: storedEntityId,
          since,
          until,
        })
        // Map backend summary to dashboard KPIs
        setRevenue(summary.orders.gross)
        setReceivables(summary.payouts.gross)
        setExpenses(summary.payouts.platformFee)
        setPendingDocs(summary.orders.count)
        setLastUpdated('revenue')
      } catch (error: any) {
        message.error(error?.response?.data?.message || '讀取儀表板資料失敗')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* AI Insights Widget */}
      <AIInsightsWidget />

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
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
      <Row gutter={[{ xs: 16, sm: 24 }, { xs: 16, sm: 24 }]}>
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
              precision={2}
              prefix="$"
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'revenue' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              來源：Shopify orders.gross
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
              title={<span className="label-text font-medium">平台撥款總額</span>}
              value={receivables}
              precision={2}
              prefix="$"
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'receivables' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              來源：Shopify payouts.gross
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
              title={<span className="label-text font-medium">平台費用</span>}
              value={expenses}
              precision={2}
              prefix="$"
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'expenses' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              來源：Shopify payouts.platformFee
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
              title={<span className="label-text font-medium">訂單數</span>}
              value={pendingDocs}
              className={`kpi-number transition-colors duration-300 ${lastUpdated === 'pendingDocs' ? 'animate-flash-text' : ''}`}
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '28px' }}
            />
            <div className="mt-2 text-sm text-gray-400">
              來源：Shopify orders.count
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Financial Health Widget */}
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <FinancialHealthWidget />
      </div>

      {/* Recent Activity & Tasks */}
      <Row gutter={[{ xs: 16, sm: 24 }, { xs: 16, sm: 24 }]}>
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
