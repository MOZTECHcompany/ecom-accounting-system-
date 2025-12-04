import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Tag, message, Typography, Row, Col, Statistic, Button, Input, Space, Tooltip } from 'antd';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  WarningOutlined, 
  CheckCircleOutlined, 
  SearchOutlined, 
  DownloadOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { attendanceService } from '../../services/attendance.service';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const AttendanceAdminPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState('');

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'green',
      pending: 'orange',
      missing_clock: 'red',
      late: 'volcano',
      leave: 'blue'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      completed: '正常',
      pending: '進行中',
      missing_clock: '缺卡',
      late: '遲到',
      leave: '請假'
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '員工姓名',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      render: (text: string) => (
        <Space>
          <UserOutlined className="text-gray-400" />
          <Text strong>{text}</Text>
        </Space>
      ),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value: any, record: any) => 
        record.employee?.name?.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: '部門',
      dataIndex: ['employee', 'department', 'name'],
      key: 'department',
      render: (text: string) => <Tag>{text || '未分配'}</Tag>,
    },
    {
      title: '上班打卡',
      dataIndex: 'clockInTime',
      key: 'clockInTime',
      render: (text: string) => text ? (
        <span className="font-mono">{dayjs(text).format('HH:mm:ss')}</span>
      ) : (
        <Tag color="error">未打卡</Tag>
      ),
    },
    {
      title: '下班打卡',
      dataIndex: 'clockOutTime',
      key: 'clockOutTime',
      render: (text: string) => text ? (
        <span className="font-mono">{dayjs(text).format('HH:mm:ss')}</span>
      ) : (
        <span className="text-gray-300">-</span>
      ),
    },
    {
      title: '工時',
      dataIndex: 'workedMinutes',
      key: 'workedMinutes',
      render: (minutes: number) => minutes ? `${(minutes / 60).toFixed(1)} 小時` : '-',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Tooltip title="查看詳情">
            <Button type="text" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="修正打卡">
            <Button type="text" icon={<EditOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Calculate stats
  const stats = {
    total: data.length,
    present: data.filter(d => d.clockInTime).length,
    missing: data.filter(d => !d.clockInTime).length,
    late: data.filter(d => d.status === 'late').length,
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title level={2}>考勤管理總覽</Title>
          <Text type="secondary">管理與監控每日員工出勤狀況</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} className="rounded-lg">匯出報表</Button>
          <DatePicker 
            value={selectedDate} 
            onChange={(date) => date && setSelectedDate(date)} 
            allowClear={false}
            size="large"
            className="rounded-lg"
          />
        </Space>
      </div>

      <Row gutter={[24, 24]} className="mb-6">
        <Col xs={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="應到人數"
              value={stats.total}
              prefix={<UserOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="實到人數"
              value={stats.present}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="缺卡/未到"
              value={stats.missing}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: '16px' }}>
            <Statistic
              title="遲到"
              value={stats.late}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-md border-0" bordered={false} headStyle={{ borderBottom: 'none', padding: '24px 24px 0' }} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '24px' }}>
        <div className="mb-4 flex justify-between items-center">
          <Title level={4} className="m-0">每日考勤明細</Title>
          <Input 
            placeholder="搜尋員工姓名..." 
            prefix={<SearchOutlined />} 
            className="w-64 rounded-lg"
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
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
