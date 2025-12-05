import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Drawer,
  Table,
  Tag,
  Typography,
  message,
  Statistic,
  Row,
  Col,
  Space
} from 'antd'
import { 
  DollarOutlined, 
  PlayCircleOutlined, 
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { GlassDrawer, GlassDrawerSection } from '../components/ui/GlassDrawer'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { payrollService } from '../services/payroll.service'
import { PayrollRun } from '../types'

const { Title, Text } = Typography

const PayrollPage: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const result = await payrollService.getPayrollRuns()
      setRuns(Array.isArray(result?.items) ? result.items : [])
    } catch (error) {
      message.error('載入薪資單失敗')
      setRuns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await payrollService.createPayrollRun({
        periodStart: values.period[0].toISOString(),
        periodEnd: values.period[1].toISOString(),
        payDate: values.payDate.toISOString(),
      })
      message.success('薪資計算已啟動')
      setDrawerOpen(false)
      form.resetFields()
      fetchRuns()
    } catch (error) {
      // Error
    }
  }

  const columns = [
    { 
      title: '計薪期間', 
      key: 'period',
      render: (_: any, record: PayrollRun) => (
        `${dayjs(record.periodStart).format('YYYY-MM-DD')} ~ ${dayjs(record.periodEnd).format('YYYY-MM-DD')}`
      )
    },
    { 
      title: '發薪日', 
      dataIndex: 'payDate', 
      key: 'payDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    { 
      title: '總金額', 
      dataIndex: 'totalAmount', 
      key: 'totalAmount',
      render: (val: number) => `$${(val || 0).toLocaleString()}`
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default'
        if (status === 'COMPLETED') color = 'green'
        if (status === 'DRAFT') color = 'orange'
        if (status === 'APPROVED') color = 'blue'
        return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Button type="text" icon={<FileTextOutlined />}>明細</Button>
      )
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-end">
        <div>
          <Title level={2} className="!mb-1 !font-light">薪資管理</Title>
          <Text className="text-gray-500">薪資計算與發放紀錄</Text>
        </div>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setDrawerOpen(true)}>
          執行薪資計算
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="本月預估薪資支出"
              value={1250000}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="待發放人數"
              value={45}
              prefix={<TeamOutlined />}
              suffix="人"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="下次發薪日"
              value="2025-12-05"
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-card" bordered={false}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={runs}
        />
      </Card>

      <GlassDrawer
        title="執行薪資計算"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
      >
        <Form form={form} layout="vertical" className="h-full flex flex-col">
          <div className="flex-1 space-y-4">
            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">計算參數</div>
              <Form.Item name="period" label="計薪期間" rules={[{ required: true }]}>
                <DatePicker.RangePicker className="w-full" />
              </Form.Item>
              <Form.Item name="payDate" label="預計發薪日" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </GlassDrawerSection>
            
            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">進階選項</div>
              <Form.Item label="包含獎金" name="includeBonus" valuePropName="checked" initialValue={true}>
                 <Input type="checkbox" className="w-4 h-4" />
              </Form.Item>
              <Text type="secondary" className="text-xs">
                系統將自動計算本期出勤、加班費與勞健保扣除額。
              </Text>
            </GlassDrawerSection>
          </div>

          <GlassDrawerSection>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDrawerOpen(false)} className="rounded-full">取消</Button>
              <Button type="primary" onClick={handleCreate} className="rounded-full bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-200">
                開始計算
              </Button>
            </div>
          </GlassDrawerSection>
        </Form>
      </GlassDrawer>
    </motion.div>
  )
}

export default PayrollPage
