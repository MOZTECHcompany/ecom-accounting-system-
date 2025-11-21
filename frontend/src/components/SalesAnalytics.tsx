import React, { useState } from 'react'
import { Card, Statistic, Row, Col, Segmented, Tag, Typography, Space, Button } from 'antd'
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ThunderboltFilled,
  PieChartOutlined,
  LineChartOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, ComposedChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts'
import { motion } from 'framer-motion'

const { Text, Title } = Typography

const data = [
  { name: 'Mon', revenue: 4000, profit: 2400, orders: 24 },
  { name: 'Tue', revenue: 3000, profit: 1398, orders: 18 },
  { name: 'Wed', revenue: 2000, profit: 980, orders: 12 },
  { name: 'Thu', revenue: 2780, profit: 1908, orders: 20 },
  { name: 'Fri', revenue: 1890, profit: 1100, orders: 15 },
  { name: 'Sat', revenue: 2390, profit: 1500, orders: 19 },
  { name: 'Sun', revenue: 3490, profit: 2100, orders: 28 },
]

const pieData = [
  { name: 'Electronics', value: 400 },
  { name: 'Clothing', value: 300 },
  { name: 'Home', value: 300 },
  { name: 'Books', value: 200 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const SalesAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('Week')

  return (
    <div className="mb-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
            <ThunderboltFilled className="text-xl" />
          </div>
          <div>
            <Title level={4} className="!mb-0">智慧銷售儀表板</Title>
            <Text type="secondary" className="text-xs">AI 驅動的即時數據分析</Text>
          </div>
        </div>
        <Segmented 
          options={['Today', 'Week', 'Month', 'Year']} 
          value={timeRange}
          onChange={setTimeRange}
          className="glass-segment"
        />
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card !border-0 overflow-hidden relative h-32 flex flex-col justify-center">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="#1890ff" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="relative z-10">
                <Statistic 
                  title={<span className="text-gray-500 font-medium">總營收 (Revenue)</span>}
                  value={158900} 
                  prefix="NT$" 
                  precision={0}
                  valueStyle={{ fontWeight: 600 }}
                />
                <div className="flex items-center gap-1 text-green-500 text-xs mt-1 font-medium">
                  <ArrowUpOutlined /> <span>12.5% 較上週</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} md={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card !border-0 overflow-hidden relative h-32 flex flex-col justify-center">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <Bar dataKey="orders" fill="#52c41a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="relative z-10">
                <Statistic 
                  title={<span className="text-gray-500 font-medium">訂單轉換率 (Conversion)</span>}
                  value={88.5} 
                  suffix="%" 
                  precision={1}
                  valueStyle={{ fontWeight: 600 }}
                />
                <div className="flex items-center gap-1 text-green-500 text-xs mt-1 font-medium">
                  <ArrowUpOutlined /> <span>5.2% 較上週</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} md={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card !border-0 overflow-hidden relative h-32 flex flex-col justify-center">
               <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10">
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
              </div>
              <div className="relative z-10">
                <Statistic 
                  title={<span className="text-gray-500 font-medium">平均客單價 (AOV)</span>}
                  value={3250} 
                  prefix="NT$" 
                  precision={0}
                  valueStyle={{ fontWeight: 600 }}
                />
                <div className="flex items-center gap-1 text-red-500 text-xs mt-1 font-medium">
                  <ArrowDownOutlined /> <span>2.1% 較上週</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Advanced Charts Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="h-full"
          >
            <Card className="glass-card !border-0 h-full" title={<Space><LineChartOutlined /> <span className="text-sm font-medium">營收與獲利趨勢分析</span></Space>}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" name="營收" fill="#1890ff" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="profit" name="淨利" stroke="#52c41a" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </Col>
        
        <Col xs={24} lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="h-full"
          >
            <Card className="glass-card !border-0 h-full" title={<Space><PieChartOutlined /> <span className="text-sm font-medium">銷售類別占比</span></Space>}>
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-2xl font-bold text-gray-700">1,200</div>
                  <div className="text-xs text-gray-400">Total Items</div>
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* AI Insight Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg flex items-start gap-4 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <ThunderboltFilled className="text-xl text-yellow-300" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg mb-1">AI 智慧洞察</h4>
            <p className="text-white/90 text-sm leading-relaxed">
              根據本週數據分析，您的 <span className="font-bold text-yellow-300">Electronics</span> 類別銷售額成長了 15%，主要受惠於週末的促銷活動。
              建議下週可針對 <span className="font-bold text-yellow-300">Home</span> 類別進行類似的搭售策略以提升客單價。
            </p>
          </div>
          <Button type="text" className="text-white/70 hover:text-white absolute top-2 right-2" icon={<CloseCircleOutlined />} />
        </div>
      </motion.div>
    </div>
  )
}

export default SalesAnalytics
