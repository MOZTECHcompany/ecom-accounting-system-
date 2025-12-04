import React, { useEffect, useState } from 'react'
import { Card, Typography, Skeleton, Button } from 'antd'
import { RobotOutlined, ReloadOutlined } from '@ant-design/icons'
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
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch AI insight', error)
        setInsight('暫時無法取得 AI 財務簡報。')
      }
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

export default AIInsightsWidget
