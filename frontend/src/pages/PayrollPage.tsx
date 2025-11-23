import React, { useEffect, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
  message,
  Statistic,
  Row,
  Col
} from 'antd'
import { 
  DollarOutlined, 
  PlayCircleOutlined, 
  FileTextOutlined 
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { payrollService } from '../services/payroll.service'
import { PayrollRun } from '../types'

const { Title, Text } = Typography

const PayrollPage: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const result = await payrollService.getPayrollRuns()
      setRuns(result.items)
    } catch (error) {
      message.error('載入薪資單失敗')
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
      setCreateOpen(false)
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
      render: (val: number) => `$${val.toLocaleString()}`
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
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setCreateOpen(true)}>
          執行薪資計算
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card className="glass-card">
            <Statistic
              title="本月預估薪資支出"
              value={1250000}
              prefix={<DollarOutlined />}
              precision={0}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="glass-card">
            <Statistic
              title="待發放人數"
              value={45}
              suffix="人"
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

      <Modal
        title="執行薪資計算"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="period" label="計薪期間" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
          <Form.Item name="payDate" label="預計發薪日" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  )
}

export default PayrollPage
