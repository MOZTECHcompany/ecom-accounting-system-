import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Row, Col, message, Statistic, Tag, Space } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
      setLastAction({ type: '上班', time: dayjs().format('HH:mm:ss') });
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
      setLastAction({ type: '下班', time: dayjs().format('HH:mm:ss') });
    } catch (error) {
      console.error(error);
      message.error('打卡失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Title level={2}>員工考勤儀表板</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12} lg={8}>
          <Card title="打卡作業" className="shadow-md">
            <div className="text-center mb-6">
              <Title level={1} className="m-0">{currentTime.format('HH:mm:ss')}</Title>
              <Text type="secondary">{currentTime.format('YYYY年MM月DD日 dddd')}</Text>
            </div>

            <div className="mb-4 text-center">
              {location ? (
                <Tag icon={<EnvironmentOutlined />} color="green">
                  已定位: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </Tag>
              ) : (
                <Tag icon={<EnvironmentOutlined />} color="red">
                  {locationError || '定位中...'}
                </Tag>
              )}
            </div>

            <Space className="w-full justify-center" size="large">
              <Button
                type="primary"
                size="large"
                shape="round"
                className="h-24 w-24 text-lg bg-blue-600"
                onClick={handleClockIn}
                loading={loading}
                disabled={!location}
              >
                上班
              </Button>
              <Button
                type="primary"
                size="large"
                shape="round"
                className="h-24 w-24 text-lg bg-orange-500 hover:bg-orange-600 border-orange-500"
                onClick={handleClockOut}
                loading={loading}
                disabled={!location}
              >
                下班
              </Button>
            </Space>

            {lastAction && (
              <div className="mt-6 text-center">
                <Text type="success">
                  <CheckCircleOutlined /> 最近動作: {lastAction.type} 於 {lastAction.time}
                </Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} lg={8}>
          <Card title="今日概況" className="shadow-md h-full">
            <Statistic
              title="工作時數"
              value={0}
              precision={1}
              suffix="小時"
              prefix={<ClockCircleOutlined />}
            />
            <div className="mt-4">
              <Text type="secondary">上班時間: --:--</Text>
              <br />
              <Text type="secondary">下班時間: --:--</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeDashboardPage;
