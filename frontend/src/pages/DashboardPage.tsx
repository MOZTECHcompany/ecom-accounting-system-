import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import { DollarOutlined, ShoppingOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons'

const DashboardPage: React.FC = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>儀表板</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月營收"
              value={1128930}
              prefix={<DollarOutlined />}
              suffix="TWD"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月訂單"
              value={234}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="應收帳款"
              value={456780}
              prefix={<BankOutlined />}
              suffix="TWD"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="員工人數"
              value={23}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
