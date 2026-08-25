import React, { useState } from 'react'
import {
  Upload,
  Button,
  Table,
  Select,
  message,
  Steps,
  Typography,
  Alert,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  InboxOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { motion } from 'framer-motion'

const { Dragger } = Upload
const { Title, Text } = Typography
const { Option } = Select

type ImportRow = Record<string, unknown>

interface ImportConfig {
  type: 'salary' | 'fixed_expense'
  label: string
  columns: ColumnsType<ImportRow>
  sampleData: ImportRow[]
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
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewData, setPreviewData] = useState<ImportRow[]>([])

  const handleFileRead = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<ImportRow>(sheet)
        setPreviewData(jsonData)
        message.success(`成功解析 ${jsonData.length} 筆資料；目前僅供預覽，尚未匯入系統`)
        setCurrentStep(1)
      } catch (error) {
        console.error(error)
        message.error('檔案解析失敗，請確認格式')
      }
    }
    reader.readAsBinaryString(file)
  }

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
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

  const reset = () => {
    setCurrentStep(0)
    setFileList([])
    setPreviewData([])
  }

  const config = IMPORT_TYPES[importType]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-1 !font-light">
            資料匯入中心
          </Title>
          <Text type="secondary">檢查薪資與固定費用檔案</Text>
        </div>
        <Select
          value={importType}
          onChange={(value) => {
            setImportType(value)
            reset()
          }}
          size="large"
          className="w-48"
        >
          <Option value="salary">薪資匯入</Option>
          <Option value="fixed_expense">固定費用匯入</Option>
        </Select>
      </div>

      <Alert
        type="warning"
        showIcon
        message="目前僅提供檔案預覽，不會寫入系統"
        className="!rounded-2xl"
      />

      <div className="glass-panel p-8">
        <Steps
          current={currentStep}
          className="mb-8"
          items={[
            { title: '選擇檔案', icon: <UploadOutlined /> },
            { title: '本機預覽', icon: <FileExcelOutlined /> },
          ]}
        />

        {currentStep === 0 && (
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <Dragger {...props} className="!bg-white/50 !border-dashed !border-2">
              <p className="ant-upload-drag-icon">
                <InboxOutlined className="text-blue-500" />
              </p>
              <p className="ant-upload-text">點擊或拖曳檔案至此區域進行本機預覽</p>
              <p className="ant-upload-hint">
                支援 .xlsx, .csv 格式；檔案只會在瀏覽器中解析，不會上傳至後端。
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
          <div className="space-y-8">
            <Alert
              message={`已解析 ${previewData.length} 筆資料`}
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
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ImportPage
