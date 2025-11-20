import React, { useEffect, useState } from 'react'
import { Row, Col, Statistic, Typography, Progress, Avatar, Tooltip } from 'antd'
import { 
  DollarOutlined, 
  ShoppingOutlined, 
  BankOutlined, 
  TeamOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  FileTextOutlined,
  MoreOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  UserOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const DashboardPage: React.FC = () => {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('早安')
    else if (hour < 18) setGreeting('午安')
    else setGreeting('晚安')
  }, [])

  const stats = [
    {
      title: '本月總營收',
      value: 1128930,
      prefix: <DollarOutlined />,
      suffix: 'TWD',
      color: 'from-blue-500 to-blue-600',
      trend: 12.5,
      trendUp: true
    },
    {
      title: '本月訂單數',
      value: 234,
      prefix: <ShoppingOutlined />,
      suffix: '筆',
      color: 'from-purple-500 to-purple-600',
      trend: 5.2,
      trendUp: true
    },
    {
      title: '待處理帳款',
      value: 456780,
      prefix: <BankOutlined />,
      suffix: 'TWD',
      color: 'from-orange-500 to-orange-600',
      trend: 2.1,
      trendUp: false
    },
    {
      title: '活躍用戶',
      value: 1205,
      prefix: <TeamOutlined />,
      suffix: '人',
      color: 'from-cyan-500 to-cyan-600',
      trend: 8.4,
      trendUp: true
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div>
          <Title level={2} className="!text-white font-light !mb-2">
            {greeting}，管理員
          </Title>
          <Text className="text-white/50 text-lg font-light">
            這是您今天的營運概況與待辦事項
          </Text>
        </div>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <Text className="!text-white/80 text-sm">系統運作正常</Text>
        </div>
      </div>
      
      {/* Stats Grid */}
      <Row gutter={[24, 24]}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <div 
              className="glass-card p-6 hover:bg-white/5 transition-all duration-500 group cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500`}>
                  <span className="text-white text-xl">{stat.prefix}</span>
                </div>
                <div className={`flex items-center text-sm font-medium ${stat.trendUp ? 'text-green-400' : 'text-red-400'} bg-white/5 px-2 py-1 rounded-lg`}>
                  {stat.trendUp ? <ArrowUpOutlined className="mr-1" /> : <ArrowDownOutlined className="mr-1" />}
                  {stat.trend}%
                </div>
              </div>
              <div className="space-y-1">
                <Text className="text-white/50 text-sm block">{stat.title}</Text>
                <Statistic
                  value={stat.value}
                  suffix={<span className="text-white/40 text-sm ml-1">{stat.suffix}</span>}
                  valueStyle={{ color: '#fff', fontWeight: 600, fontSize: '28px' }}
                />
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Main Content Grid */}
      <Row gutter={[24, 24]} className="mt-8">
        {/* Chart Section */}
        <Col xs={24} lg={16}>
          <div className="glass-card p-8 h-full min-h-[500px] animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <Title level={4} className="!text-white/90 !mb-1">營收趨勢分析</Title>
                <Text className="text-white/40 text-sm">過去 30 天的財務表現</Text>
              </div>
              <div className="flex gap-2">
                {['週', '月', '年'].map((period, i) => (
                  <button 
                    key={period}
                    className={`px-4 py-1 rounded-lg text-sm transition-all ${i === 1 ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chart Placeholder with Animation */}
            <div className="relative h-[350px] w-full flex items-end justify-between px-4 gap-2">
              {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 95].map((h, i) => (
                <div key={i} className="w-full h-full flex items-end group relative">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500/20 to-blue-400/50 rounded-t-lg transition-all duration-500 group-hover:from-blue-500/40 group-hover:to-blue-400/70"
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-black/50 px-2 py-1 rounded">
                      {h * 1000}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-white/10 text-xs">
                {[100, 75, 50, 25, 0].map((val) => (
                  <div key={val} className="w-full border-t border-dashed border-white/5 relative">
                    <span className="absolute -left-8 -top-2">{val}k</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Col>

        {/* Right Sidebar */}
        <Col xs={24} lg={8}>
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <div className="flex justify-between items-center mb-6">
                <Title level={4} className="!text-white/90 !m-0">近期活動</Title>
                <MoreOutlined className="text-white/40 cursor-pointer hover:text-white" />
              </div>
              <div className="space-y-4">
                {[
                  { title: '新訂單 #2025001', time: '2 分鐘前', icon: <ShoppingOutlined />, color: 'bg-blue-500' },
                  { title: '收到款項 $12,500', time: '15 分鐘前', icon: <DollarOutlined />, color: 'bg-green-500' },
                  { title: '新用戶註冊', time: '1 小時前', icon: <UserOutlined />, color: 'bg-purple-500' },
                  { title: '系統備份完成', time: '3 小時前', icon: <CheckCircleFilled />, color: 'bg-orange-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
                    <div className={`w-10 h-10 rounded-full ${item.color}/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <span className={`${item.color.replace('bg-', 'text-')}`}>{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white/90 font-medium">{item.title}</div>
                      <div className="text-white/40 text-xs flex items-center mt-1">
                        <ClockCircleFilled className="mr-1 text-[10px]" />
                        {item.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Transfer */}
            <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Title level={4} className="!text-white/90 mb-6">快速轉帳</Title>
              <div className="flex gap-4 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2 min-w-[60px] cursor-pointer group">
                    <Avatar size={48} src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} className="border-2 border-transparent group-hover:border-blue-500 transition-all" />
                    <span className="text-white/60 text-xs group-hover:text-white">User {i}</span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2 min-w-[60px] cursor-pointer group">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 group-hover:border-white/60 group-hover:text-white transition-all">
                    +
                  </div>
                  <span className="text-white/60 text-xs">新增</span>
                </div>
              </div>
              <div className="glass-panel p-1 rounded-xl flex items-center">
                <input 
                  type="text" 
                  placeholder="輸入金額" 
                  className="bg-transparent border-none text-white px-4 py-2 w-full focus:outline-none placeholder-white/30"
                />
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20">
                  轉帳
                </button>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
