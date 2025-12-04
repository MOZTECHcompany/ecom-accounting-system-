import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Tag, message, Typography } from 'antd';
import { attendanceService } from '../../services/attendance.service';
import dayjs from 'dayjs';

const { Title } = Typography;

const AttendanceAdminPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const loadData = async (date: dayjs.Dayjs) => {
    try {
      setLoading(true);
      const result = await attendanceService.getDailySummary(date.format('YYYY-MM-DD'));
      setData(result);
    } catch (error) {
      console.error(error);
      message.error('無法載入考勤資料');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '員工',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
    },
    {
      title: '上班打卡',
      dataIndex: 'clockInTime',
      key: 'clockInTime',
      render: (text: string) => text ? dayjs(text).format('HH:mm:ss') : <Tag color="red">未打卡</Tag>,
    },
    {
      title: '下班打卡',
      dataIndex: 'clockOutTime',
      key: 'clockOutTime',
      render: (text: string) => text ? dayjs(text).format('HH:mm:ss') : '-',
    },
    {
      title: '工時 (分鐘)',
      dataIndex: 'workedMinutes',
      key: 'workedMinutes',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          completed: 'green',
          pending: 'orange',
          missing_clock: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>考勤管理總覽</Title>
        <DatePicker 
          value={selectedDate} 
          onChange={(date) => date && setSelectedDate(date)} 
          allowClear={false}
        />
      </div>

      <Card className="shadow-md">
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
};

export default AttendanceAdminPage;
