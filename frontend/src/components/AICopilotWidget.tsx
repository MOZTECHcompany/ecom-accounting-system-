import React, { useState, useRef, useEffect } from 'react'
import { Button, Input, Avatar, Card, Typography, Space, Spin } from 'antd'
import { 
  RobotOutlined, 
  SendOutlined, 
  CloseOutlined, 
  UserOutlined,
  BulbOutlined,
  BarChartOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'

const { Text } = Typography

interface Message {
  id: string
  type: 'user' | 'ai'
  content: React.ReactNode
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  { icon: <BarChartOutlined />, text: "分析本月銷售趨勢" },
  { icon: <SearchOutlined />, text: "查詢未付款訂單" },
  { icon: <BulbOutlined />, text: "如何提升客單價？" },
]

const AICopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "嗨！我是您的 AI 財務助手。我可以協助您分析數據、查詢訂單或解答系統問題。請問今天有什麼可以幫您？",
      timestamp: new Date()
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI processing
    setTimeout(() => {
      let aiResponse = "我收到您的請求了，正在為您分析..."
      
      if (text.includes("銷售") || text.includes("趨勢")) {
        aiResponse = "根據數據分析，本月銷售額較上月成長 12.5%。主要增長來自 Electronics 類別。建議您可以查看銷售儀表板獲取更多細節。"
      } else if (text.includes("未付款")) {
        aiResponse = "目前系統中有 5 筆逾期未付款的訂單，總金額為 NT$ 45,200。我已經將列表整理好，您是否要發送催款通知？"
      } else if (text.includes("客單價")) {
        aiResponse = "目前的平均客單價 (AOV) 為 NT$ 3,250。建議透過「滿額免運」或「加價購」策略，有機會將 AOV 提升至 NT$ 3,500 以上。"
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 1500)
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          className="!w-14 !h-14 !bg-gradient-to-r !from-indigo-500 !to-purple-600 !border-0 !shadow-lg !shadow-indigo-500/40 flex items-center justify-center"
          onClick={() => setIsOpen(!isOpen)}
          icon={isOpen ? <CloseOutlined className="text-xl" /> : <RobotOutlined className="text-2xl" />}
        />
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 right-8 z-40 w-[380px] h-[600px] max-h-[80vh]"
          >
            <Card 
              className="h-full shadow-2xl !rounded-2xl overflow-hidden flex flex-col glass-card !border-0 !bg-white/90 backdrop-blur-xl"
              bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <RobotOutlined className="text-xl" />
                </div>
                <div>
                  <div className="font-bold text-gray-800">AI Copilot</div>
                  <div className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Online
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar 
                        size="small" 
                        icon={msg.type === 'user' ? <UserOutlined /> : <RobotOutlined />}
                        className={msg.type === 'user' ? '!bg-gray-800' : '!bg-indigo-500'}
                      />
                      <div 
                        className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.type === 'user' 
                            ? 'bg-gray-800 text-white rounded-tr-none' 
                            : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-2">
                      <Avatar size="small" icon={<RobotOutlined />} className="!bg-indigo-500" />
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Prompts */}
              {messages.length === 1 && (
                <div className="px-4 pb-2">
                  <Text type="secondary" className="text-xs mb-2 block ml-1">建議提問：</Text>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <Button 
                        key={idx} 
                        size="small" 
                        className="!rounded-full !text-xs !bg-white hover:!border-indigo-500 hover:!text-indigo-500"
                        icon={prompt.icon}
                        onClick={() => handleSend(prompt.text)}
                      >
                        {prompt.text}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <Space.Compact style={{ width: '100%' }}>
                  <Input 
                    placeholder="輸入您的問題..." 
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onPressEnter={() => handleSend()}
                    className="!rounded-l-xl"
                    disabled={isTyping}
                  />
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />} 
                    onClick={() => handleSend()}
                    className="!rounded-r-xl !bg-indigo-600"
                    disabled={isTyping}
                  />
                </Space.Compact>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AICopilotWidget
