import React, { useState, useRef, useEffect } from 'react'
import { Button, Input, Avatar, Card, Typography, Space } from 'antd'
import { 
  SendOutlined, 
  CloseOutlined, 
  UserOutlined,
  BulbOutlined,
  BarChartOutlined,
  SearchOutlined,
  AudioOutlined,
  PictureOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { aiService } from '../services/ai.service'
import { useAI } from '../contexts/AIContext'

const { Text } = Typography

// Gemini Sparkle Icon
const GeminiIcon = ({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width="1em"
    height="1em"
  >
    <path d="M12 2C12 2 13.5 7.5 16 10C18.5 12.5 22 12 22 12C22 12 18.5 13.5 16 16C13.5 18.5 12 22 12 22C12 22 10.5 18.5 8 16C5.5 13.5 2 12 2 12C2 12 5.5 12.5 8 10C10.5 7.5 12 2 12 2Z" />
  </svg>
)

interface Message {
  id: string
  type: 'user' | 'ai'
  content: React.ReactNode
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  { icon: <DollarOutlined />, text: "查詢 Power Bank 成本" },
  { icon: <BarChartOutlined />, text: "分析本月銷售趨勢" },
  { icon: <SearchOutlined />, text: "查詢未付款訂單" },
]

const AICopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "你好！我是 Gemini 3.0 財務助手。我可以協助你查詢產品成本、分析銷售數據或解答系統問題。",
      timestamp: new Date()
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { selectedModelId } = useAI()
  const entityId = import.meta.env.VITE_DEFAULT_ENTITY_ID || 'tw-entity-001'

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

    try {
      const response = await aiService.chat(text, entityId, selectedModelId)
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.reply,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error('AI Chat Error', error)
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "抱歉，我現在無法連線到 AI 服務，請稍後再試。",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMsg])
      }
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          className={`!w-14 !h-14 !border-0 !shadow-lg flex items-center justify-center overflow-hidden relative group ${isOpen ? '!bg-gray-900' : ''}`}
          style={{
            background: isOpen ? '#1f1f1f' : 'linear-gradient(135deg, #4E75F6 0%, #8E4EC6 50%, #E34F6F 100%)'
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <CloseOutlined className="text-xl text-white" />
          ) : (
            <GeminiIcon className="text-2xl text-white animate-pulse" />
          )}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-28 right-8 z-40 w-[400px] h-[650px] max-h-[80vh]"
          >
            <Card 
              className="h-full shadow-2xl !rounded-3xl overflow-hidden flex flex-col !border-0 !bg-white/95 backdrop-blur-xl"
              bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100/50 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <GeminiIcon className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" style={{ fill: 'url(#gemini-gradient)' }} />
                    {/* SVG Gradient Definition */}
                    <svg width="0" height="0" className="absolute">
                      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop stopColor="#4E75F6" offset="0%" />
                        <stop stopColor="#8E4EC6" offset="50%" />
                        <stop stopColor="#E34F6F" offset="100%" />
                      </linearGradient>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-base bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Gemini
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium tracking-wide">
                      GEMINI 3.0 PRO
                    </div>
                  </div>
                </div>
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<CloseOutlined className="text-gray-400" />} 
                  onClick={() => setIsOpen(false)}
                  className="hover:!bg-gray-100"
                />
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white scrollbar-hide">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.type === 'ai' && (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                          <GeminiIcon className="text-xl" style={{ fill: 'url(#gemini-gradient)' }} />
                        </div>
                      )}
                      
                      <div 
                        className={`py-3 px-4 text-[15px] leading-relaxed ${
                          msg.type === 'user' 
                            ? 'bg-[#f0f4f9] text-gray-800 rounded-[20px] rounded-tr-sm' 
                            : 'text-gray-700'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                         <GeminiIcon className="text-xl animate-pulse" style={{ fill: 'url(#gemini-gradient)' }} />
                      </div>
                      <div className="py-3 px-4">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Prompts */}
              {messages.length === 1 && (
                <div className="px-6 pb-4">
                  <div className="flex flex-col gap-2">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full text-left p-3 rounded-xl bg-[#f0f4f9] hover:bg-gray-100 transition-colors flex items-center gap-3 text-gray-600 text-sm group border-0 cursor-pointer"
                        onClick={() => handleSend(prompt.text)}
                      >
                        <span className="p-2 bg-white rounded-full shadow-sm text-indigo-500 group-hover:text-indigo-600 transition-colors">
                          {prompt.icon}
                        </span>
                        {prompt.text}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-5 bg-white">
                <div className="relative bg-[#f0f4f9] rounded-[24px] p-2 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white focus-within:shadow-md border border-transparent focus-within:border-blue-200">
                  <Input.TextArea 
                    placeholder="問問 Gemini..." 
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    className="!bg-transparent !border-0 !shadow-none !resize-none !text-base !px-3 !py-2 focus:!shadow-none"
                    disabled={isTyping}
                  />
                  <div className="flex justify-between items-center px-2 pb-1 mt-1">
                    <div className="flex gap-1">
                       <Button type="text" shape="circle" size="small" icon={<PictureOutlined className="text-gray-400" />} />
                       <Button type="text" shape="circle" size="small" icon={<AudioOutlined className="text-gray-400" />} />
                    </div>
                    <Button 
                      type="text" 
                      shape="circle"
                      icon={
                        inputValue.trim() ? (
                          <SendOutlined className="text-blue-600" />
                        ) : (
                          <SendOutlined className="text-gray-400" />
                        )
                      }
                      onClick={() => handleSend()}
                      disabled={isTyping || !inputValue.trim()}
                      className={inputValue.trim() ? "!bg-blue-50" : ""}
                    />
                  </div>
                </div>
                <div className="text-center mt-2">
                  <Text type="secondary" className="text-[10px]">
                    Gemini 可能會顯示不準確的資訊，請務必再次確認。
                  </Text>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AICopilotWidget
