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

const { Title, Text } = Typography

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <Title level={2} className="!text-gray-800 font-light tracking-tight !mb-1">
          Dashboard
        </Title>
        <Text className="text-gray-500">
          歡迎回來，管理員。這是您今天的財務健康概況。
        </Text>
      </div>
      
      {/* Key Metrics Cards */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 border-l-4 border-blue-500"
          >
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
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 border-l-4 border-orange-500"
          >
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
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 border-l-4 border-purple-500"
          >
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
              預算達成率: <span className="text-blue-500">85%</span>
            </div>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 transition-all duration-300 border-l-4 border-teal-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                <FileTextOutlined className="text-teal-500 text-lg" />
              </div>
              <Tag color="blue" className="m-0 rounded-full border-none bg-blue-50 text-blue-600 px-2">
                3 筆待簽
              </Tag>
            </div>
            <Statistic
              title={<span className="text-gray-500 text-sm">待處理單據</span>}
              value={15}
              valueStyle={{ color: '#1d1d1f', fontWeight: 600, fontSize: '24px' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              包含發票與報銷單
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Financial Health Widget */}
      <FinancialHealthWidget />

      {/* Recent Activity & Tasks */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
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
        </Col>
        <Col xs={24} lg={12}>
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
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
