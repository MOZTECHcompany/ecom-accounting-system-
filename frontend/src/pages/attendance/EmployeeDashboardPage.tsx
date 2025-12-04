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
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">打卡儀表板</h1>
          <p className="text-slate-500 text-sm">歡迎回來，請確認您的打卡狀態</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/30 px-3 py-1.5 rounded-full border border-white/20">
          <ClockCircleOutlined />
          <span>{currentTime.format('YYYY年MM月DD日 dddd')}</span>
        </div>
      </div>
      
      {/* Stats Grid - Moved to top like AP page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ClockCircleOutlined className="text-6xl text-blue-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">累積工時</div>
          <div className="text-3xl font-semibold text-slate-800 mb-1">0 <span className="text-sm font-normal text-slate-400">小時</span></div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <WarningOutlined className="text-6xl text-red-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">遲到次數</div>
          <div className="text-3xl font-semibold text-slate-800 mb-1">0 <span className="text-sm font-normal text-slate-400">次</span></div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <EnvironmentOutlined className="text-6xl text-purple-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">特休餘額</div>
          <div className="text-3xl font-semibold text-slate-800 mb-1">10 <span className="text-sm font-normal text-slate-400">天</span></div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LogoutOutlined className="text-6xl text-orange-500" />
          </div>
          <div className="text-sm text-slate-500 mb-2 font-medium">本月請假</div>
          <div className="text-3xl font-semibold text-slate-800 mb-1">0 <span className="text-sm font-normal text-slate-400">小時</span></div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Clock Widget & Actions */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Clock Widget */}
          <GlassCard className="flex flex-col items-center justify-center py-12 w-full">
            <div className="text-[80px] font-light tracking-wider text-slate-900/80 leading-none font-mono">
              {currentTime.format('HH:mm')}
              <span className="text-4xl ml-3 text-slate-400">{currentTime.format('ss')}</span>
            </div>
            
            {/* Location Status */}
            <div className="mt-8">
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
          <div className="grid grid-cols-2 gap-6 w-full">
            <GlassButton 
              variant="primary" 
              size="lg" 
              className="h-24 flex items-center justify-center gap-4 hover:scale-[1.02] transition-transform"
              onClick={handleClockIn}
              disabled={!location || loading}
            >
              <LoginOutlined className="text-3xl" />
              <span className="text-2xl font-medium">上班打卡</span>
            </GlassButton>

            <GlassButton 
              variant="orange" 
              size="lg" 
              className="h-24 flex items-center justify-center gap-4 hover:scale-[1.02] transition-transform"
              onClick={handleClockOut}
              disabled={!location || loading}
            >
              <LogoutOutlined className="text-3xl" />
              <span className="text-2xl font-medium">下班打卡</span>
            </GlassButton>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Last Action Status */}
          {lastAction && (
            <div className="animate-[fadeInUp_0.3s_ease-out]">
              <GlassCard className="py-4 px-6 flex items-center justify-between bg-green-50/30 border-green-200/30 w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                    <CheckCircleOutlined className="text-xl" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">最新動作</div>
                    <div className="text-lg font-semibold text-slate-800">{lastAction.type}</div>
                  </div>
                </div>
                <div className="text-2xl font-light text-slate-700 font-mono">
                  {lastAction.time}
                </div>
              </GlassCard>
            </div>
          )}

          <GlassCard className="flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">今日打卡紀錄</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {todayRecords.length} 筆紀錄
              </span>
            </div>
            
            {todayRecords.length > 0 ? (
              <div className="space-y-3">
                {todayRecords.map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/40 hover:bg-white/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        record.type === 'clock_in' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {record.type === 'clock_in' ? <LoginOutlined /> : <LogoutOutlined />}
                      </div>
                      <span className="text-slate-700 font-medium">
                        {record.type === 'clock_in' ? '上班打卡' : '下班打卡'}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono font-medium">{record.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <ClockCircleOutlined className="text-3xl mb-2 opacity-50" />
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
