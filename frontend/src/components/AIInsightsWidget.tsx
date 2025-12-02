import React, { useEffect, useState } from 'react'
import { Card, Typography, Skeleton, Button, Space } from 'antd'
import { RobotOutlined, ReloadOutlined, RiseOutlined } from '@ant-design/icons'
import { aiService } from '../services/ai.service'
import { useAI } from '../contexts/AIContext'
import { motion } from 'framer-motion'

const { Text, Title } = Typography

const AIInsightsWidget: React.FC = () => {
  const [insight, setInsight] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { selectedModelId } = useAI()
  const entityId = import.meta.env.VITE_DEFAULT_ENTITY_ID || 'tw-entity-001'

  const fetchInsight = async () => {
    setLoading(true)
    try {
      const data = await aiService.getDailyBriefing(entityId, selectedModelId)
      setInsight(data.insight)
    } catch (error) {
      console.error('Failed to fetch AI insight', error)
      setInsight('暫時無法取得 AI 財務簡報。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsight()
  }, [selectedModelId])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card 
        className="glass-card border-l-4 border-l-purple-500" 
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <RobotOutlined style={{ fontSize: '24px' }} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <Title level={5} style={{ margin: 0, color: '#722ed1' }}>
                AI 財務日報 (Daily Insights)
              </Title>
              <Button 
                type="text" 
                icon={<ReloadOutlined />} 
                size="small" 
                onClick={fetchInsight} 
                loading={loading}
              />
            </div>
            <Skeleton active loading={loading} paragraph={{ rows: 1 }}>
              <Text className="text-gray-600 text-base leading-relaxed">
                {insight}
              </Text>
            </Skeleton>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default AIInsightsWidget    >
      {/* Shimmering Border Container */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-2xl opacity-30 blur group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-gradient-xy"></div>
      
      <div className="relative flex items-start gap-4 p-5 rounded-2xl bg-[var(--glass-card-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-lg">
        {/* AI Icon with Pulse */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-purple-500 blur-lg opacity-20 animate-pulse"></div>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white shadow-inner">
            {loading ? <LoadingOutlined spin /> : <ThunderboltOutlined className="text-lg" />}
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wider">
              AI Daily Insight
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium border border-purple-200">
              BETA
            </span>
          </div>
          
          <div className="min-h-[24px]">
            {loading ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                {insight}
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-purple-500 animate-pulse"></span>
              </p>
            )}
          </div>
        </div>

        <button 
          onClick={() => setVisible(false)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="sr-only">Dismiss</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

export default AIInsightsWidget
