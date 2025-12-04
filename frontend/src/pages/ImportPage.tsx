import React, { useState } from 'react'
import {
  Upload,
  Button,
  Table,
  Select,
  message,
  Steps,
  Card,
  Typography,
  Space,
  Alert,
  Progress,
} from 'antd'
import {
  InboxOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { motion } from 'framer-motion'

const { Dragger } = Upload
const { Title, Text } = Typography
const { Option } = Select

interface ImportConfig {
  type: 'salary' | 'fixed_expense'
  label: string
  columns: any[]
  sampleData: any[]
}

const IMPORT_TYPES: Record<string, ImportConfig> = {
  salary: {
    type: 'salary',
    label: '薪資匯入',
    columns: [
      { title: '員工編號', dataIndex: 'employeeId', key: 'employeeId' },
      { title: '姓名', dataIndex: 'name', key: 'name' },
      { title: '基本薪資', dataIndex: 'baseSalary', key: 'baseSalary' },
      { title: '獎金', dataIndex: 'bonus', key: 'bonus' },
      { title: '扣款', dataIndex: 'deduction', key: 'deduction' },
      { title: '發放日期', dataIndex: 'paymentDate', key: 'paymentDate' },
    ],
    sampleData: [
      {
        employeeId: 'EMP001',
        name: '王小明',
        baseSalary: 50000,
        bonus: 2000,
        deduction: 1000,
        paymentDate: '2025-12-05',
      },
    ],
  },
  fixed_expense: {
    type: 'fixed_expense',
    label: '固定費用匯入',
    columns: [
      { title: '費用描述', dataIndex: 'description', key: 'description' },
      { title: '金額', dataIndex: 'amount', key: 'amount' },
      { title: '幣別', dataIndex: 'currency', key: 'currency' },
      { title: '供應商', dataIndex: 'vendor', key: 'vendor' },
      { title: '日期', dataIndex: 'date', key: 'date' },
      { title: '分類', dataIndex: 'category', key: 'category' },
    ],
    sampleData: [
      {
        description: '辦公室租金',
        amount: 150000,
        currency: 'TWD',
        vendor: '房東太太',
        date: '2025-12-01',
        category: '租金支出',
      },
    ],
  },
}

const ImportPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [importType, setImportType] = useState<string>('salary')
  const [fileList, setFileList] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileRead = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        setPreviewData(jsonData)
        message.success(`成功解析 ${jsonData.length} 筆資料`)
        setCurrentStep(1)
      } catch (error) {
        console.error(error)
        message.error('檔案解析失敗，請確認格式')
      }
    }
    reader.readAsBinaryString(file)
  }

  const props = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: (file: File) => {
      setFileList([file])
      handleFileRead(file)
      return false
    },
    onRemove: () => {
      setFileList([])
      setPreviewData([])
      setCurrentStep(0)
    },
  }

  const handleImport = async () => {
    setUploading(true)
    setProgress(0)

    // Simulate API call with progress
    const total = previewData.length
    const batchSize = 50
    const batches = Math.ceil(total / batchSize)

    for (let i = 0; i < batches; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay
      const currentProgress = Math.round(((i + 1) / batches) * 100)
      setProgress(currentProgress)
    }

    setUploading(false)
    setCurrentStep(2)
    message.success('匯入完成')
  }

  const reset = () => {
    setCurrentStep(0)
    setFileList([])
    setPreviewData([])
    setProgress(0)
  }

  const config = IMPORT_TYPES[importType]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-1 !font-light">
            資料匯入中心
          </Title>
          <Text type="secondary">批次匯入薪資、固定費用與其他交易紀錄</Text>
        </div>
        <Select
          value={importType}
          onChange={setImportType}
          size="large"
          className="w-48"
        >
          <Option value="salary">薪資匯入</Option>
          <Option value="fixed_expense">固定費用匯入</Option>
        </Select>
      </div>

      <div className="glass-panel p-8">
        <Steps
          current={currentStep}
          className="mb-8"
          items={[
            { title: '上傳檔案', icon: <UploadOutlined /> },
            { title: '預覽與確認', icon: <FileExcelOutlined /> },
            { title: '匯入完成', icon: <CheckCircleOutlined /> },
          ]}
        />

        {currentStep === 0 && (
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <Dragger {...props} className="!bg-white/50 !border-dashed !border-2">
              <p className="ant-upload-drag-icon">
                <InboxOutlined className="text-blue-500" />
              </p>
              <p className="ant-upload-text">點擊或拖曳檔案至此區域上傳</p>
              <p className="ant-upload-hint">
                支援 .xlsx, .csv 格式。請確保欄位名稱符合範本。
              </p>
            </Dragger>

            <div className="text-left">
              <Text strong>欄位範本說明：</Text>
              <Table
                dataSource={config.sampleData}
                columns={config.columns}
                pagination={false}
                size="small"
                className="mt-2 border rounded-lg overflow-hidden"
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <Alert
              message={`準備匯入 ${previewData.length} 筆資料`}
              description="請檢查下方資料是否正確。若有錯誤，請修改 Excel 檔案後重新上傳。"
              type="info"
              showIcon
            />
            
            <Table
              dataSource={previewData}
              columns={config.columns}
              scroll={{ x: true }}
              pagination={{ pageSize: 10 }}
              rowKey={(record, index) => index!.toString()}
            />

            <div className="flex justify-end gap-4">
              <Button onClick={reset}>重新上傳</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={uploading}
                size="large"
              >
                確認匯入
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="text-center py-12 space-y-6">
            <CheckCircleOutlined className="text-6xl text-green-500" />
            <div>
              <Title level={3}>匯入成功</Title>
              <Text type="secondary">
                已成功將 {previewData.length} 筆資料匯入至系統
              </Text>
            </div>
            <Button type="primary" onClick={reset}>
              繼續匯入
            </Button>
          </div>
        )}

        {uploading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-96 text-center glass-panel">
              <Space direction="vertical" size="large" className="w-full">
                <Title level={4}>資料處理中...</Title>
                <Progress percent={progress} status="active" />
                <Text type="secondary">請勿關閉視窗</Text>
              </Space>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ImportPage
