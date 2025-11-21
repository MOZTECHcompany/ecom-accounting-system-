import React from 'react'
import { Card, Row, Col, Typography, Progress, Statistic, Tooltip } from 'antd'
import { InfoCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts'
import { motion } from 'framer-motion'

const { Title, Text } = Typography

const cashFlowData = [
  { month: 'Jun', actual: 4000, projected: 4000 },
  { month: 'Jul', actual: 3000, projected: 3200 },
  { month: 'Aug', actual: 2000, projected: 2500 },
  { month: 'Sep', actual: 2780, projected: 2900 },
  { month: 'Oct', actual: 1890, projected: 2100 },
  { month: 'Nov', actual: 2390, projected: 2600 },
  { month: 'Dec', actual: null, projected: 3800 }, // Future
  { month: 'Jan', actual: null, projected: 4200 }, // Future
]

const expenseData = [
  { name: 'COGS (銷貨成本)', value: 45000 },
  { name: 'Marketing (行銷)', value: 25000 },
  { name: 'Operations (營運)', value: 15000 },
  { name: 'Payroll (薪資)', value: 35000 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const FinancialHealthWidget: React.FC = () => {
  return (
    <div className="space-y-6">
      <Row gutter={[24, 24]}>
        {/* Cash Flow Forecast */}
        <Col xs={24} lg={16}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <Card 
              bordered={false}
              className="glass-card h-full" 
              title={
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg">現金流預測 (Cash Flow Forecast)</span>
                  <Tooltip title="基於歷史數據與 AI 模型預測未來 3 個月的現金流向" overlayClassName="glass-tooltip">
                    <InfoCircleOutlined className="text-gray-400" />
                  </Tooltip>
                </div>
              }
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007AFF" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34C759" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#86868b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#86868b', fontSize: 12 }} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                        backdropFilter: 'blur(12px)',
                        borderRadius: '16px', 
                        border: '1px solid rgba(255,255,255,0.3)', 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      itemStyle={{ color: '#1d1d1f', fontWeight: 500 }}
                      cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2 }}
                    />
                    <Legend iconType="circle" />
                    <Area 
                      type="monotone" 
                      dataKey="actual" 
                      name="實際現金流" 
                      stroke="#007AFF" 
                      fillOpacity={1} 
                      fill="url(#colorActual)" 
                      strokeWidth={3}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#007AFF' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="projected" 
                      name="預測現金流" 
                      stroke="#34C759" 
                      fillOpacity={1} 
                      fill="url(#colorProjected)" 
                      strokeDasharray="5 5"
                      strokeWidth={3}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#34C759' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* Expense Breakdown & Ratios */}
        <Col xs={24} lg={8}>
          <div className="space-y-6 h-full flex flex-col">
            {/* Expense Donut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <Card bordered={false} className="glass-card h-full" title="本月費用結構">
                <div className="h-[200px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.1))' }} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                          backdropFilter: 'blur(12px)',
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.3)', 
                          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                          padding: '8px'
                        }}
                        itemStyle={{ color: '#1d1d1f', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-xl font-bold text-gray-700 font-sf">120K</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {expenseData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-medium font-sf">{Math.round(item.value / 120000 * 100)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Quick Ratios */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card bordered={false} className="glass-card !border-0 bg-gradient-to-br from-blue-500/90 to-indigo-600/90 text-white backdrop-blur-xl shadow-lg shadow-blue-500/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/90 font-medium">流動比率 (Current Ratio)</span>
                  <Tooltip title="流動資產 / 流動負債，建議值 > 1.5" overlayClassName="glass-tooltip">
                    <InfoCircleOutlined className="text-white/70" />
                  </Tooltip>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-4xl font-bold font-sf">2.4</span>
                  <span className="text-green-300 flex items-center mb-1 text-sm font-medium bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">
                    <ArrowUpOutlined /> 健康
                  </span>
                </div>
                <Progress percent={80} showInfo={false} strokeColor="#86efac" trailColor="rgba(255,255,255,0.2)" size="small" />
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm text-white/80">
                  <span>速動比率 (Quick Ratio)</span>
                  <span className="font-mono font-bold">1.8</span>
                </div>
              </Card>
            </motion.div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default FinancialHealthWidget
