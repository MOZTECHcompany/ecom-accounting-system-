import api from './api';
import {
  ClockInDto,
  ClockOutDto,
  CreateLeaveRequestDto,
  LeaveRequest,
  AttendanceRecord,
} from '../types/attendance';

export const attendanceService = {
  clockIn: async (data: ClockInDto): Promise<AttendanceRecord> => {
    const response = await api.post<AttendanceRecord>('/attendance/clock-in', data);
    return response.data;
  },

  clockOut: async (data: ClockOutDto): Promise<AttendanceRecord> => {
    const response = await api.post<AttendanceRecord>('/attendance/clock-out', data);
    return response.data;
  },

  createLeaveRequest: async (data: CreateLeaveRequestDto): Promise<LeaveRequest> => {
    const response = await api.post<LeaveRequest>('/attendance/leaves', data);
    return response.data;
  },

  getLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const response = await api.get<LeaveRequest[]>('/attendance/leaves');
    return response.data;
  },

  getDailySummary: async (date: string): Promise<any[]> => {
    const response = await api.get<any[]>(`/attendance/admin/daily-summary?date=${date}`);
    return response.data;
  },
  
  // Mock for now, should be implemented in backend
  getLeaveTypes: async (): Promise<any[]> => {
    // This endpoint might not exist yet in backend, but we need it for the form
    // Assuming it will be implemented or we mock it for now
    return [
      { id: 'mock-sick', code: 'SICK', name: '病假' },
      { id: 'mock-personal', code: 'PERSONAL', name: '事假' },
      { id: 'mock-annual', code: 'ANNUAL', name: '特休' },
    ];
  }
};
