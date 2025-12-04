import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { 
  EnvironmentOutlined, 
  CheckCircleOutlined, 
  LoginOutlined, 
  LogoutOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { attendanceService } from '../../services/attendance.service';
import { AttendanceMethod } from '../../types/attendance';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';

dayjs.locale('zh-tw');

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
    <div className="min-h-screen p-6 md:p-10 max-w-[1100px] mx-auto animate-[fadeInUp_0.4s_ease-out]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-2">員工考勤儀表板</h1>
        <p className="text-slate-500 text-base">歡迎回來，請確認您的打卡狀態</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Clock Widget & Actions */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Clock Widget */}
          <GlassCard className="flex flex-col items-center justify-center py-10">
            <div className="text-[64px] font-light tracking-wider text-slate-900/80 leading-none">
              {currentTime.format('HH:mm')}
              <span className="text-3xl ml-2 text-slate-400">{currentTime.format('ss')}</span>
            </div>
            <div className="text-lg text-slate-500 mt-4 font-medium">
              {currentTime.format('YYYY年MM月DD日 dddd')}
            </div>

            {/* Location Status */}
            <div className="mt-6">
              {location ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium border border-green-500/20">
                  <EnvironmentOutlined />
                  <span>已定位: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 text-sm font-medium border border-orange-500/20">
                  <WarningOutlined />
                  <span>{locationError || '正在獲取位置資訊...'}</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-6">
            <GlassButton 
              variant="primary" 
              size="lg" 
              className="h-32 flex flex-col gap-3"
              onClick={handleClockIn}
              disabled={!location || loading}
            >
              <LoginOutlined className="text-3xl" />
              <span className="text-xl">上班打卡</span>
            </GlassButton>

            <GlassButton 
              variant="orange" 
              size="lg" 
              className="h-32 flex flex-col gap-3"
              onClick={handleClockOut}
              disabled={!location || loading}
            >
              <LogoutOutlined className="text-3xl" />
              <span className="text-xl">下班打卡</span>
            </GlassButton>
          </div>

          {/* Last Action Status */}
          {lastAction && (
            <div className="animate-[fadeInUp_0.3s_ease-out]">
              <GlassCard className="py-4 px-6 flex items-center justify-between bg-green-50/30 border-green-200/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                    <CheckCircleOutlined className="text-xl" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">最新動作</div>
                    <div className="text-lg font-semibold text-slate-800">{lastAction.type}</div>
                  </div>
                </div>
                <div className="text-2xl font-light text-slate-700">
                  {lastAction.time}
                </div>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Right Column: Stats */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <GlassCard>
            <h3 className="text-xl font-semibold text-slate-900 mb-6">本月狀況</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div className="text-sm text-slate-500 mb-1">累積工時</div>
                <div className="text-2xl font-semibold text-slate-800">0 <span className="text-sm font-normal text-slate-400">小時</span></div>
              </div>
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
                <div className="text-sm text-slate-500 mb-1">遲到次數</div>
                <div className="text-2xl font-semibold text-slate-800">0 <span className="text-sm font-normal text-slate-400">次</span></div>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                <div className="text-sm text-slate-500 mb-1">特休餘額</div>
                <div className="text-2xl font-semibold text-slate-800">10 <span className="text-sm font-normal text-slate-400">天</span></div>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                <div className="text-sm text-slate-500 mb-1">本月請假</div>
                <div className="text-2xl font-semibold text-slate-800">0 <span className="text-sm font-normal text-slate-400">小時</span></div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">今日打卡紀錄</h3>
            {todayRecords.length > 0 ? (
              <div className="space-y-3">
                {todayRecords.map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/40">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${record.type === 'clock_in' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                      <span className="text-slate-700 font-medium">
                        {record.type === 'clock_in' ? '上班打卡' : '下班打卡'}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono">{record.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                <ClockCircleOutlined className="text-2xl mb-2 opacity-50" />
                <span>尚無打卡紀錄</span>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
