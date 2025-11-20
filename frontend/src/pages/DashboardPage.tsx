import React from 'react'
import { Row, Col, Statistic, Typography } from 'antd'
import { DollarOutlined, ShoppingOutlined, BankOutlined, TeamOutlined, ArrowUpOutlined, FileTextOutlined } from '@ant-design/icons'

const { Title } = Typography

const DashboardPage: React.FC = () => {
  return (
    <div>
      <div className="mb-8">
        <Title level={2} className="!text-white font-light">歡迎回來，管理員</Title>
        <p className="text-white/60">這是您今天的營運概況</p>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
            <Statistic
              title={<span className="text-white/70">本月營收</span>}
              value={1128930}
              prefix={<DollarOutlined className="text-blue-400" />}
              suffix="TWD"
              valueStyle={{ color: '#fff', fontWeight: 600 }}
            />
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <ArrowUpOutlined className="mr-1" />
              <span>12.5% 較上月</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
            <Statistic
              title={<span className="text-white/70">本月訂單</span>}
              value={234}
              prefix={<ShoppingOutlined className="text-purple-400" />}
              valueStyle={{ color: '#fff', fontWeight: 600 }}
            />
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <ArrowUpOutlined className="mr-1" />
              <span>5.2% 較上月</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
            <Statistic
              title={<span className="text-white/70">應收帳款</span>}
              value={456780}
              prefix={<BankOutlined className="text-orange-400" />}
              suffix="TWD"
              valueStyle={{ color: '#fff', fontWeight: 600 }}
            />
            <div className="mt-4 flex items-center text-white/40 text-sm">
              <span>待處理: 12 筆</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card p-6 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
            <Statistic
              title={<span className="text-white/70">員工人數</span>}
              value={23}
              prefix={<TeamOutlined className="text-cyan-400" />}
              valueStyle={{ color: '#fff', fontWeight: 600 }}
            />
            <div className="mt-4 flex items-center text-white/40 text-sm">
              <span>本月新增: 2 人</span>
            </div>
          </div>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="mt-8">
        <Col xs={24} lg={16}>
          <div className="glass-card p-6 h-full min-h-[400px]">
            <Title level={4} className="!text-white/90 mb-6">營收趨勢</Title>
            <div className="flex items-center justify-center h-[300px] text-white/30 border-2 border-dashed border-white/10 rounded-xl">
              圖表區域 (Chart.js / Recharts)
            </div>
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="glass-card p-6 h-full">
            <Title level={4} className="!text-white/90 mb-6">近期活動</Title>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <FileTextOutlined className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white/90 font-medium">新訂單 #202500{i}</div>
                    <div className="text-white/50 text-xs">2 分鐘前</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
