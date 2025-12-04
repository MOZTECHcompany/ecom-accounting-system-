import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, Card, Table, Tag, message, InputNumber, Modal, Row, Col, Statistic, Space, Typography } from 'antd';
import { PlusOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { attendanceService } from '../../services/attendance.service';
import { LeaveRequest, LeaveStatus } from '../../types/attendance';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title } = Typography;

const LeaveRequestPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsData, typesData] = await Promise.all([
        attendanceService.getLeaveRequests(),
        attendanceService.getLeaveTypes(),
      ]);
      setRequests(requestsData);
      setLeaveTypes(typesData);
    } catch (error) {
      console.error(error);
      message.error('無法載入資料');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const [start, end] = values.dateRange;
      
      await attendanceService.createLeaveRequest({
        leaveTypeId: values.leaveTypeId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        hours: values.hours,
        reason: values.reason,
        location: values.location,
      });
      
      message.success('請假申請已送出');
      form.resetFields();
      setIsModalVisible(false);
      void loadData();
    } catch (error) {
      console.error(error);
      message.error('申請失敗');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '假別',
      dataIndex: ['leaveType', 'name'],
      key: 'leaveType',
      render: (text: string) => <Tag color="blue">{text || '未知'}</Tag>,
    },
    {
      title: '期間',
      key: 'period',
      render: (_: any, record: LeaveRequest) => (
        <Space direction="vertical" size="small">
          <span>{dayjs(record.startAt).format('YYYY-MM-DD HH:mm')}</span>
          <span className="text-gray-400 text-xs">至</span>
          <span>{dayjs(record.endAt).format('YYYY-MM-DD HH:mm')}</span>
        </Space>
      ),
    },
    {
      title: '時數',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours: number) => `${hours} 小時`,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: LeaveStatus) => {
        const config: Record<string, { color: string; text: string }> = {
          [LeaveStatus.APPROVED]: { color: 'success', text: '已核准' },
          [LeaveStatus.REJECTED]: { color: 'error', text: '已駁回' },
          [LeaveStatus.SUBMITTED]: { color: 'processing', text: '簽核中' },
          [LeaveStatus.DRAFT]: { color: 'default', text: '草稿' },
        };
        const { color, text } = config[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2}>請假管理</Title>
          <span className="text-gray-500">查看您的假單紀錄與剩餘額度</span>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          className="rounded-xl shadow-md"
          onClick={() => setIsModalVisible(true)}
        >
          新增請假申請
        </Button>
      </div>

      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={24} md={8}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="特休剩餘"
              value={10} // Mock data
              suffix="天"
              prefix={<CalendarOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="本年度已休"
              value={3.5} // Mock data
              suffix="天"
              prefix={<CheckCircleOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="待核准假單"
              value={requests.filter(r => r.status === LeaveStatus.SUBMITTED).length}
              suffix="筆"
              prefix={<ClockCircleOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-md border-0" bordered={false} title="申請紀錄" headStyle={{ borderBottom: 'none', padding: '24px 24px 0' }} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '24px' }}>
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新增請假申請"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
        className="overflow-hidden"
        style={{ borderRadius: '16px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="leaveTypeId"
              label="假別"
              rules={[{ required: true, message: '請選擇假別' }]}
            >
              <Select placeholder="選擇假別" className="rounded-lg">
                {leaveTypes.map((type) => (
                  <Option key={type.id} value={type.id}>
                    {type.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="dateRange"
              label="請假期間"
              rules={[{ required: true, message: '請選擇期間' }]}
            >
              <RangePicker showTime format="YYYY-MM-DD HH:mm" className="w-full rounded-lg" />
            </Form.Item>

            <Form.Item
              name="hours"
              label="請假時數"
              rules={[{ required: true, message: '請輸入時數' }]}
            >
              <InputNumber min={0.5} step={0.5} className="w-full rounded-lg" />
            </Form.Item>

            <Form.Item name="location" label="請假地點 (選填)">
              <Input placeholder="國內/國外地點" className="rounded-lg" />
            </Form.Item>
          </div>

          <Form.Item
            name="reason"
            label="請假事由"
            rules={[{ required: true, message: '請輸入事由' }]}
          >
            <Input.TextArea rows={4} placeholder="請詳細說明請假原因..." className="rounded-lg" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalVisible(false)} className="rounded-lg">取消</Button>
            <Button type="primary" htmlType="submit" loading={loading} className="rounded-lg">
              送出申請
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaveRequestPage;
