import React from 'react'
import { Drawer, Descriptions, Steps, Button, Tag, Divider, List, Avatar, Typography, Card } from 'antd'
import { 
  PrinterOutlined, 
  MailOutlined, 
  DownloadOutlined,
  UserOutlined,
  CreditCardOutlined,
  CarOutlined,
  CheckCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

interface OrderDetailsDrawerProps {
  open: boolean
  onClose: () => void
  order: any
}

const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({ open, onClose, order }) => {
  if (!order) return null

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full pr-8">
          <Space>
            <span className="text-lg font-semibold">訂單詳情</span>
            <Tag color="blue">{order.id}</Tag>
          </Space>
          <Space>
            <Button icon={<PrinterOutlined />}>列印</Button>
            <Button icon={<MailOutlined />}>寄送發票</Button>
            <Button type="primary">退款/售後</Button>
          </Space>
        </div>
      }
      placement="right"
      width={800}
      onClose={onClose}
      open={open}
      className="glass-drawer"
      styles={{
        header: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' },
        body: { background: '#f8fafc' }
      }}
    >
      <div className="space-y-8">
        {/* Status Timeline */}
        <Card className="shadow-sm border-0 rounded-2xl">
          <Steps
            current={order.status === 'completed' ? 3 : 1}
            items={[
              { title: '訂單建立', description: order.date, icon: <FileTextOutlined /> },
              { title: '付款確認', description: 'Credit Card', icon: <CreditCardOutlined /> },
              { title: '出貨配送', description: 'Processing', icon: <CarOutlined /> },
              { title: '訂單完成', icon: <CheckCircleOutlined /> },
            ]}
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <Card title="客戶資訊" className="shadow-sm border-0 rounded-2xl" extra={<Button type="link">查看歷史</Button>}>
            <div className="flex items-center gap-4 mb-6">
              <Avatar size={64} icon={<UserOutlined />} className="bg-blue-100 text-blue-600" />
              <div>
                <Title level={4} className="!mb-0">{order.customer}</Title>
                <Text type="secondary">VIP 會員</Text>
              </div>
            </div>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Email">contact@{order.customer.toLowerCase().replace(/\s/g, '')}.com</Descriptions.Item>
              <Descriptions.Item label="電話">+886 912 345 678</Descriptions.Item>
              <Descriptions.Item label="地址">台北市信義區信義路五段7號</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Payment Info */}
          <Card title="付款詳情" className="shadow-sm border-0 rounded-2xl">
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
                <Tag color="success">已付款</Tag>
              </div>
              <Divider className="my-4" />
              <div className="flex justify-between items-center">
                <Text type="secondary">總金額</Text>
                <Title level={3} className="!mb-0 !text-blue-600">NT$ {order.amount.toLocaleString()}</Title>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Items */}
        <Card title="訂購項目" className="shadow-sm border-0 rounded-2xl">
          <List
            itemLayout="horizontal"
            dataSource={[
              { title: 'Premium Software License', price: order.amount * 0.6, qty: 1 },
              { title: 'Maintenance Support (1 Year)', price: order.amount * 0.4, qty: 1 },
            ]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">📦</div>}
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
        </Card>
      </div>
    </Drawer>
  )
}

import { Space } from 'antd'
export default OrderDetailsDrawer
