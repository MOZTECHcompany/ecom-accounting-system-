import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Row, Col, message, Statistic, Tag, Space, Timeline, Alert, Divider } from 'antd';
import { 
  ClockCircleOutlined, 
  EnvironmentOutlined, 
  CheckCircleOutlined, 
  LoginOutlined, 
  LogoutOutlined,
  CalendarOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { attendanceService } from '../../services/attendance.service';
import { AttendanceMethod } from '../../types/attendance';

const { Title, Text } = Typography;

const EmployeeDashboardPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ type: string; time: string } | null>(null);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('無法獲取位置資訊，請確認瀏覽器權限');
        }
      );
    } else {
      setLocationError('您的瀏覽器不支援地理定位');
    }
  }, []);

  const handleClockIn = async () => {
    if (!location) {
      message.error('需要位置資訊才能打卡');
      return;
    }
    try {
      setLoading(true);
      await attendanceService.clockIn({
        method: AttendanceMethod.WEB,
        latitude: location.lat,
        longitude: location.lng,
      });
      message.success('上班打卡成功');
      const timeStr = dayjs().format('HH:mm:ss');
      setLastAction({ type: '上班', time: timeStr });
      setTodayRecords(prev => [...prev, { type: 'clock_in', time: timeStr }]);
    } catch (error) {
      console.error(error);
      message.error('打卡失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      message.error('需要位置資訊才能打卡');
      return;
    }
    try {
      setLoading(true);
      await attendanceService.clockOut({
        method: AttendanceMethod.WEB,
        latitude: location.lat,
        longitude: location.lng,
      });
      message.success('下班打卡成功');
      const timeStr = dayjs().format('HH:mm:ss');
      setLastAction({ type: '下班', time: timeStr });
      setTodayRecords(prev => [...prev, { type: 'clock_out', time: timeStr }]);
    } catch (error) {
      console.error(error);
      message.error('打卡失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Title level={2}>員工考勤儀表板</Title>
        <Text type="secondary">歡迎回來，請確認您的打卡狀態</Text>
      </div>
      
      <Row gutter={[24, 24]}>
        {/* Left Column: Clock In/Out Action */}
        <Col xs={24} lg={14}>
          <Card className="shadow-md h-full border-0" bordered={false}>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-gray-800 font-mono mb-2">
                  {currentTime.format('HH:mm:ss')}
                </div>
                <div className="text-lg text-gray-500">
                  {currentTime.format('YYYY年MM月DD日 dddd')}
                </div>
              </div>

              <div className="mb-8 w-full max-w-md">
                {location ? (
                  <Alert 
                    message={`已定位: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`} 
                    type="success" 
                    showIcon 
                    icon={<EnvironmentOutlined />}
                    className="text-center"
                  />
                ) : (
                  <Alert 
                    message={locationError || '正在獲取位置資訊...'} 
                    type="warning" 
                    showIcon 
                    icon={<EnvironmentOutlined />}
                    className="text-center"
                  />
                )}
              </div>

              <div className="flex gap-8 justify-center w-full">
                <Button
                  type="primary"
                  shape="circle"
                  className="h-32 w-32 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-500 border-0 shadow-lg transition-transform hover:scale-105"
                  onClick={handleClockIn}
                  loading={loading}
                  disabled={!location}
                >
                  <LoginOutlined className="text-3xl mb-2" />
                  <span className="text-lg font-bold">上班打卡</span>
                </Button>
                
                <Button
                  type="primary"
                  shape="circle"
                  className="h-32 w-32 flex flex-col items-center justify-center bg-orange-500 hover:bg-orange-400 border-0 shadow-lg transition-transform hover:scale-105"
                  onClick={handleClockOut}
                  loading={loading}
                  disabled={!location}
                >
                  <LogoutOutlined className="text-3xl mb-2" />
                  <span className="text-lg font-bold">下班打卡</span>
                </Button>
              </div>

              {lastAction && (
                <div className="mt-8 animate-fade-in">
                  <Tag color="success" className="px-4 py-2 text-base rounded-full">
                    <CheckCircleOutlined /> 最新動作: {lastAction.type} ({lastAction.time})
                  </Tag>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Right Column: Stats & Timeline */}
        <Col xs={24} lg={10}>
          <Row gutter={[0, 24]}>
            <Col span={24}>
              <Card title="本月概況" className="shadow-md border-0" bordered={false}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="累積工時"
                      value={0}
                      precision={1}
                      suffix="小時"
                      prefix={<ClockCircleOutlined className="text-blue-500" />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="遲到次數"
                      value={0}
                      valueStyle={{ color: '#cf1322' }}
                      prefix={<WarningOutlined />}
                    />
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="特休餘額"
                      value={10}
                      suffix="天"
                      prefix={<CalendarOutlined className="text-green-500" />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="本月請假"
                      value={0}
                      suffix="天"
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="今日打卡紀錄" className="shadow-md border-0 h-full" bordered={false}>
                {todayRecords.length > 0 ? (
                  <Timeline
                    items={todayRecords.map((record, index) => ({
                      color: record.type === 'clock_in' ? 'blue' : 'orange',
                      children: (
                        <>
                          <Text strong>{record.type === 'clock_in' ? '上班' : '下班'}</Text>
                          <br/>
                          <Text type="secondary">{record.time}</Text>
                        </>
                      ),
                    }))}
                  />
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    尚無今日紀錄
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeDashboardPage;
