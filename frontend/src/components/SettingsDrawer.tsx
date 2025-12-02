import React from 'react'
import { Drawer, Switch, Radio, Typography, Divider, Space, Select, Tag } from 'antd'
import { useTheme } from '../contexts/ThemeContext'
import { useAI } from '../contexts/AIContext'
import { BulbOutlined, BulbFilled, CheckCircleFilled, RobotOutlined } from '@ant-design/icons'

// Gemini Sparkle Icon
const GeminiIcon = ({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="url(#gemini-gradient)" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    width="1em"
    height="1em"
  >
    <defs>
      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4facfe" />
        <stop offset="100%" stopColor="#00f2fe" />
      </linearGradient>
    </defs>
    <path d="M12 2C12 2 13.5 7.5 16 10C18.5 12.5 22 12 22 12C22 12 18.5 13.5 16 16C13.5 18.5 12 22 12 22C12 22 10.5 18.5 8 16C5.5 13.5 2 12 2 12C2 12 5.5 12.5 8 10C10.5 7.5 12 2 12 2Z" />
  </svg>
)


const { Title, Text } = Typography

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const { mode, toggleMode, primaryColor, setPrimaryColor } = useTheme()
  const { selectedModelId, setSelectedModelId, availableModels, loading: aiLoading } = useAI()

  const colors = [
    { name: 'Classic Black', value: 'black', hex: '#000000' },
    { name: 'Tech Blue', value: 'blue', hex: '#1677ff' },
    { name: 'Royal Purple', value: 'purple', hex: '#722ed1' },
    { name: 'Fresh Green', value: 'green', hex: '#52c41a' },
    { name: 'Warm Orange', value: 'orange', hex: '#fa8c16' },
  ]

  return (
    <Drawer
      title="介面設定 (Interface Settings)"
      placement="right"
      onClose={onClose}
      open={open}
      width={320}
      className={mode === 'dark' ? 'dark-drawer' : ''}
    >
      <div className="space-y-8">
        {/* Theme Mode */}
        <div>
          <Title level={5} className="mb-4">外觀模式 (Appearance)</Title>
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
            <button
              onClick={() => mode === 'dark' && toggleMode()}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'light' 
                  ? 'bg-white shadow-sm text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Space>
                <BulbOutlined /> 淺色 Light
              </Space>
            </button>
            <button
              onClick={() => mode === 'light' && toggleMode()}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'dark' 
                  ? 'bg-gray-700 shadow-sm text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Space>
                <BulbFilled /> 深色 Dark
              </Space>
            </button>
          </div>
        </div>

        <Divider />

        {/* Primary Color */}
        <div>
          <Title level={5} className="mb-4">主題色系 (Accent Color)</Title>
        {/* AI Settings */}
        <div>
          <Title level={5} className="mb-4">
            <Space>
              <GeminiIcon className="text-blue-500" /> AI 智能設定 (AI Agent)
            </Space>
          </Title>
          <div className="mb-2 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <Text className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              預設語言模型 (Default Model)
            </Text>
            <Select
              className="w-full"
              size="large"
              loading={aiLoading}
              value={selectedModelId}
              onChange={setSelectedModelId}
              optionLabelProp="label"
              options={availableModels.map(m => ({
                label: (
                  <Space>
                    <GeminiIcon />
                    <span className="font-medium">{m.name}</span>
                    {m.isExperimental && <Tag color="purple" className="ml-1 text-[10px] border-0">Preview</Tag>}
                  </Space>
                ),
                value: m.id,
                labelString: m.name // Custom prop for filtering if needed
              }))}
              dropdownRender={(menu) => (
                <div className="p-1">
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <div className="px-2 py-1 text-xs text-gray-400">
                    Powered by Google Gemini
                  </div>
                </div>
              )}
            />
            <Text type="secondary" className="block mt-3 text-xs leading-relaxed">
              <Space align="start">
                <BulbOutlined className="mt-0.5 text-yellow-500" />
                <span>此模型將應用於全系統的 AI 輔助功能，包含費用分類預測、財報分析與 Copilot 助手。</span>
              </Space>
            </Text>
          </div>
        </div>
          <div className="mb-2">
            <Text className="block mb-2 text-sm">預設語言模型 (Default Model)</Text>
            <Select
              className="w-full"
              loading={aiLoading}
              value={selectedModelId}
              onChange={setSelectedModelId}
              options={availableModels.map(m => ({
                label: (
                  <Space>
                    <span>{m.name}</span>
                    {m.isExperimental && <Tag color="purple" className="mr-0 text-[10px]">Preview</Tag>}
                  </Space>
                ),
                value: m.id
              }))}
            />
            <Text type="secondary" className="block mt-2 text-xs">
              此模型將應用於全系統的 AI 輔助功能（如：費用分類、財報分析、Copilot 助手）。
            </Text>
          </div>
        </div>

        <Divider />

        {/* Other Settings Placeholder */}
        <div>
          <Title level={5} className="mb-4">顯示設定 (Display)</Title>
          <div className="flex items-center justify-between mb-4">
            <Text>緊湊模式 (Compact Mode)</Text>
            <Switch size="small" />
          </div>
          <div className="flex items-center justify-between">
            <Text>減少動畫 (Reduce Motion)</Text>
            <Switch size="small" />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default SettingsDrawer
