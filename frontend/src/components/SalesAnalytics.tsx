import React from 'react'
import { Card, Statistic, Row, Col } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { motion } from 'framer-motion'

const data = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 2000 },
  { name: 'Thu', value: 2780 },
  { name: 'Fri', value: 1890 },
  { name: 'Sat', value: 2390 },
  { name: 'Sun', value: 3490 },
]

const data2 = [
  { name: 'Mon', value: 2400 },
  { name: 'Tue', value: 1398 },
  { name: 'Wed', value: 9800 },
  { name: 'Thu', value: 3908 },
  { name: 'Fri', value: 4800 },
  { name: 'Sat', value: 3800 },
  { name: 'Sun', value: 4300 },
]

const SalesAnalytics: React.FC = () => {
  return (
    <Row gutter={[16, 16]} className="mb-6">
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
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#1890ff" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="relative z-10">
              <Statistic 
                title={<span className="text-gray-500 font-medium">本週總營收</span>}
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
                <BarChart data={data2}>
                  <Bar dataKey="value" fill="#52c41a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="relative z-10">
              <Statistic 
                title={<span className="text-gray-500 font-medium">訂單轉換率</span>}
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
               {/* Decorative Circle */}
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
  )
}

export default SalesAnalytics
