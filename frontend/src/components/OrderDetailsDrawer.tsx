import React, { useState } from 'react'
import { Descriptions, Steps, Button, Tag, Divider, List, Avatar, Typography, Space } from 'antd'
import { GlassDrawer, GlassDrawerSection } from './ui/GlassDrawer'
import { 
  PrinterOutlined, 
  MailOutlined, 
  DownloadOutlined,
  UserOutlined,
  CreditCardOutlined,
  CarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SendOutlined
} from '@ant-design/icons'
import FulfillOrderModal from './FulfillOrderModal'

const { Title, Text } = Typography

interface OrderDetailsDrawerProps {
  open: boolean
  onClose: () => void
  order: any
  onUpdate?: () => void
}

const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({ open, onClose, order, onUpdate }) => {
  const [fulfillModalOpen, setFulfillModalOpen] = useState(false)

  if (!order) return null

  return (
    <>
      <GlassDrawer
        title={
          <div className="flex items-center justify-between w-full pr-8">
            <Space>
              <span className="text-lg font-semibold">訂單詳情</span>
              <Tag color="blue">{order.id}</Tag>
            </Space>
            <Space>
              <Button icon={<PrinterOutlined />} className="rounded-full">列印</Button>
              <Button icon={<MailOutlined />} className="rounded-full">寄送發票</Button>
              {order.status !== 'completed' && (
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  className="rounded-full bg-green-600 hover:bg-green-500 border-none shadow-lg shadow-green-200"
                  onClick={() => setFulfillModalOpen(true)}
                >
                  出貨
                </Button>
              )}
              <Button type="primary" className="rounded-full bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-200">退款/售後</Button>
            </Space>
          </div>
        }
        placement="right"
        width={800}
        onClose={onClose}
        open={open}
      >
        <div className="space-y-4">
          {/* Status Timeline */}
          <GlassDrawerSection>
            <Steps
              current={order.status === 'completed' ? 3 : 1}
              items={[
                { title: '訂單建立', description: order.date, icon: <FileTextOutlined /> },
                { title: '付款確認', description: 'Credit Card', icon: <CreditCardOutlined /> },
                { title: '出貨配送', description: 'Processing', icon: <CarOutlined /> },
                { title: '訂單完成', icon: <CheckCircleOutlined /> },
              ]}
            />
          </GlassDrawerSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <GlassDrawerSection>
              <div className="flex justify-between items-center mb-4">
                <div className="font-semibold text-slate-800">客戶資訊</div>
                <Button type="link" className="p-0 h-auto">查看歷史</Button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <Avatar size={64} icon={<UserOutlined />} className="bg-blue-100 text-blue-600" />
                <div>
                  <Title level={4} className="!mb-0">{order.customer}</Title>
                  <Text type="secondary">VIP 會員</Text>
                </div>
              </div>
              <Descriptions column={1} size="small" labelStyle={{ background: 'transparent' }} contentStyle={{ background: 'transparent' }}>
                <Descriptions.Item label="Email">contact@{order.customer.toLowerCase().replace(/\s/g, '')}.com</Descriptions.Item>
                <Descriptions.Item label="電話">+886 912 345 678</Descriptions.Item>
                <Descriptions.Item label="地址">台北市信義區信義路五段7號</Descriptions.Item>
              </Descriptions>
            </GlassDrawerSection>

            {/* Payment Info */}
            <GlassDrawerSection>
              <div className="mb-4 font-semibold text-slate-800">付款詳情</div>
              <div className="flex flex-col h-full justify-center">
                <div className="flex justify-between items-center mb-4">
                  <Text type="secondary">付款方式</Text>
                  <div className="flex items-center gap-2">
                    <CreditCardOutlined className="text-xl" />
                    <Text strong>{order.paymentMethod}</Text>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <Text type="secondary">付款狀態</Text>
                  <Tag color="success" className="rounded-full px-2 border-none">已付款</Tag>
                </div>
                <Divider className="my-4" />
                <div className="flex justify-between items-center">
                  <Text type="secondary">總金額</Text>
                  <Title level={3} className="!mb-0 !text-blue-600">NT$ {order.amount.toLocaleString()}</Title>
                </div>
              </div>
            </GlassDrawerSection>
          </div>

          {/* Order Items */}
          <GlassDrawerSection>
            <div className="mb-4 font-semibold text-slate-800">訂購項目</div>
            <List
              itemLayout="horizontal"
              dataSource={[
                { title: 'Premium Software License', price: order.amount * 0.6, qty: 1 },
                { title: 'Maintenance Support (1 Year)', price: order.amount * 0.4, qty: 1 },
              ]}
              renderItem={(item) => (
                <List.Item className="border-b border-slate-100 last:border-0">
                  <List.Item.Meta
                    avatar={<div className="w-12 h-12 bg-white/60 rounded-lg flex items-center justify-center text-xl">📦</div>}
                    title={item.title}
                    description={`Quantity: ${item.qty}`}
                  />
                  <div className="font-medium">NT$ {item.price.toLocaleString()}</div>
                </List.Item>
              )}
            />
            <div className="flex justify-end mt-6 space-y-2">
              <div className="w-64">
                <div className="flex justify-between mb-2">
                  <Text>小計</Text>
                  <Text>NT$ {order.amount.toLocaleString()}</Text>
                </div>
                <div className="flex justify-between mb-2">
                  <Text>稅額 (5%)</Text>
                  <Text>NT$ {(order.amount * 0.05).toLocaleString()}</Text>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between">
                  <Text strong>總計</Text>
                  <Text strong className="text-lg">NT$ {(order.amount * 1.05).toLocaleString()}</Text>
                </div>
              </div>
            </div>
          </GlassDrawerSection>
        </div>
      </GlassDrawer>
      <FulfillOrderModal 
        open={fulfillModalOpen} 
        onClose={() => setFulfillModalOpen(false)} 
        onSuccess={() => {
          setFulfillModalOpen(false)
          onUpdate?.()
        }}
        order={order}
      />
    </>
  )
}

export default OrderDetailsDrawer
