import React from 'react'
import { Drawer, Switch, Radio, Typography, Divider, Space, Select, Tag } from 'antd'
import { useTheme } from '../contexts/ThemeContext'
import { useAI } from '../contexts/AIContext'
import { BulbOutlined, BulbFilled, CheckCircleFilled, RobotOutlined } from '@ant-design/icons'

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
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setPrimaryColor(color.value as any)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {primaryColor === color.value && (
                  <CheckCircleFilled className="text-white text-lg drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
          <Text type="secondary" className="block mt-2 text-xs">
            選擇您喜好的系統主色調
          </Text>
        </div>

        <Divider />

        {/* AI Settings */}
        <div>
          <Title level={5} className="mb-4">
            <Space>
              <RobotOutlined /> AI 智能設定 (AI Agent)
            </Space>
          </Title>
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
