import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Select, Button, Card, Table, Tag, message, InputNumber } from 'antd';
import { attendanceService } from '../../services/attendance.service';
import { LeaveRequest, LeaveStatus } from '../../types/attendance';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const LeaveRequestPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

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
      render: (text: string, record: LeaveRequest) => record.leaveType?.name || '未知',
    },
    {
      title: '開始時間',
      dataIndex: 'startAt',
      key: 'startAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '結束時間',
      dataIndex: 'endAt',
      key: 'endAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '時數',
      dataIndex: 'hours',
      key: 'hours',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: LeaveStatus) => {
        const colors: Record<string, string> = {
          [LeaveStatus.APPROVED]: 'green',
          [LeaveStatus.REJECTED]: 'red',
          [LeaveStatus.SUBMITTED]: 'blue',
          [LeaveStatus.DRAFT]: 'default',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];

  return (
    <div className="p-6">
      <Card title="請假申請" className="mb-6 shadow-md">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="leaveTypeId"
              label="假別"
              rules={[{ required: true, message: '請選擇假別' }]}
            >
              <Select placeholder="選擇假別">
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
              <RangePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item
              name="hours"
              label="請假時數"
              rules={[{ required: true, message: '請輸入時數' }]}
            >
              <InputNumber min={0.5} step={0.5} className="w-full" />
            </Form.Item>

            <Form.Item name="location" label="請假地點 (選填)">
              <Input placeholder="國內/國外地點" />
            </Form.Item>
          </div>

          <Form.Item
            name="reason"
            label="請假事由"
            rules={[{ required: true, message: '請輸入事由' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              送出申請
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="申請紀錄" className="shadow-md">
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default LeaveRequestPage;
