import React from 'react'
import { Row, Col, Skeleton, Card } from 'antd'

const PageSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton.Input active size="large" style={{ width: 200, marginBottom: 8 }} />
        <br />
        <Skeleton.Input active size="small" style={{ width: 400 }} />
      </div>

      {/* Metrics Cards Skeleton */}
      <Row gutter={[24, 24]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className="glass-card p-6 h-40 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <Skeleton.Avatar active shape="circle" size="large" />
                <Skeleton.Button active size="small" style={{ width: 60 }} />
              </div>
              <div>
                <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
                <Skeleton.Input active size="large" style={{ width: 150 }} />
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Charts Skeleton */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <div className="glass-card p-6 h-[400px]">
            <div className="flex justify-between mb-6">
              <Skeleton.Input active style={{ width: 150 }} />
              <Skeleton.Button active />
            </div>
            <Skeleton.Node active style={{ width: '100%', height: 300 }} />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="glass-card p-6 h-[400px]">
            <Skeleton.Input active style={{ width: 120, marginBottom: 24 }} />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton.Avatar active shape="square" />
                  <div className="flex-1">
                    <Skeleton.Input active size="small" block />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default PageSkeleton
