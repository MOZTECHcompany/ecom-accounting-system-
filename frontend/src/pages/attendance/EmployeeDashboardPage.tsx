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
          <Card className="shadow-lg h-full border-0" bordered={false} style={{ borderRadius: '24px' }}>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center mb-10">
                <div className="text-7xl font-bold text-gray-800 font-mono mb-4 tracking-wider">
                  {currentTime.format('HH:mm:ss')}
                </div>
                <div className="text-xl text-gray-500">
                  {currentTime.format('YYYY年MM月DD日 dddd')}
                </div>
              </div>

              <div className="mb-10 w-full max-w-lg">
                {location ? (
                  <Alert 
                    message={<span className="font-medium text-base">已定位: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
                    type="success" 
                    showIcon 
                    icon={<EnvironmentOutlined />}
                    className="text-center border-0 bg-green-50 text-green-700 py-2"
                    style={{ borderRadius: '12px' }}
                  />
                ) : (
                  <Alert 
                    message={locationError || '正在獲取位置資訊...'} 
                    type="warning" 
                    showIcon 
                    icon={<EnvironmentOutlined />}
                    className="text-center border-0 bg-orange-50 text-orange-700 py-2"
                    style={{ borderRadius: '12px' }}
                  />
                )}
              </div>

              <div className="flex gap-8 justify-center w-full">
                <button
                  className={`h-40 w-48 flex flex-col items-center justify-center border-0 shadow-xl transition-all rounded-3xl ${
                    !location || loading 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:-translate-y-1 hover:shadow-2xl cursor-pointer'
                  }`}
                  onClick={handleClockIn}
                  disabled={!location || loading}
                >
                  <div className="bg-white/20 p-4 rounded-full mb-3">
                    <LoginOutlined className="text-3xl text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-wide text-white">上班打卡</span>
                </button>
                
                <button
                  className={`h-40 w-48 flex flex-col items-center justify-center border-0 shadow-xl transition-all rounded-3xl ${
                    !location || loading 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 hover:-translate-y-1 hover:shadow-2xl cursor-pointer'
                  }`}
                  onClick={handleClockOut}
                  disabled={!location || loading}
                >
                  <div className="bg-white/20 p-4 rounded-full mb-3">
                    <LogoutOutlined className="text-3xl text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-wide text-white">下班打卡</span>
                </button>
              </div>

              {lastAction && (
                <div className="mt-10 animate-fade-in">
                  <Tag color="success" className="px-6 py-2 text-lg border-0 bg-green-100 text-green-700 flex items-center gap-2" style={{ borderRadius: '50px' }}>
                    <CheckCircleOutlined /> 
                    <span>最新動作: {lastAction.type} ({lastAction.time})</span>
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
              <Card title="本月概況" className="shadow-lg border-0" bordered={false} headStyle={{ borderBottom: 'none', padding: '24px 24px 0' }} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '24px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div className="bg-blue-50 p-4" style={{ borderRadius: '16px' }}>
                      <Statistic
                        title={<span className="text-gray-500 font-medium">累積工時</span>}
                        value={0}
                        precision={1}
                        suffix="小時"
                        valueStyle={{ fontWeight: 'bold', color: '#1d4ed8' }}
                        prefix={<ClockCircleOutlined className="text-blue-500 mr-2" />}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="bg-red-50 p-4" style={{ borderRadius: '16px' }}>
                      <Statistic
                        title={<span className="text-gray-500 font-medium">遲到次數</span>}
                        value={0}
                        valueStyle={{ fontWeight: 'bold', color: '#dc2626' }}
                        prefix={<WarningOutlined className="text-red-500 mr-2" />}
                      />
                    </div>
                  </Col>
                </Row>
                <div className="h-4"></div>
                <Row gutter={16}>
                  <Col span={12}>
                    <div className="bg-green-50 p-4" style={{ borderRadius: '16px' }}>
                      <Statistic
                        title={<span className="text-gray-500 font-medium">特休餘額</span>}
                        value={10}
                        suffix="天"
                        valueStyle={{ fontWeight: 'bold', color: '#15803d' }}
                        prefix={<CalendarOutlined className="text-green-500 mr-2" />}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="bg-gray-50 p-4" style={{ borderRadius: '16px' }}>
                      <Statistic
                        title={<span className="text-gray-500 font-medium">本月請假</span>}
                        value={0}
                        suffix="天"
                        valueStyle={{ fontWeight: 'bold', color: '#374151' }}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="今日打卡紀錄" className="shadow-lg border-0 h-full" bordered={false} headStyle={{ borderBottom: 'none', padding: '24px 24px 0' }} bodyStyle={{ padding: '24px' }} style={{ borderRadius: '24px' }}>
                {todayRecords.length > 0 ? (
                  <Timeline
                    items={todayRecords.map((record, index) => ({
                      color: record.type === 'clock_in' ? 'blue' : 'orange',
                      children: (
                        <div className="flex flex-col pb-4">
                          <Text strong className="text-lg">{record.type === 'clock_in' ? '上班' : '下班'}</Text>
                          <Text type="secondary" className="font-mono">{record.time}</Text>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <div className="text-center text-gray-400 py-12 bg-gray-50 border border-dashed border-gray-200" style={{ borderRadius: '16px' }}>
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
