export enum AttendanceMethod {
  MOBILE = 'MOBILE',
  WEB = 'WEB',
  KIOSK = 'KIOSK',
}

export enum AttendanceEventType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
}

export enum LeaveStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface ClockInDto {
  method: AttendanceMethod;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  deviceInfo?: any;
  photoUrl?: string;
  notes?: string;
}

export interface ClockOutDto {
  method: AttendanceMethod;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  deviceInfo?: any;
  photoUrl?: string;
  notes?: string;
}

export interface CreateLeaveRequestDto {
  leaveTypeId: string;
  startAt: string;
  endAt: string;
  hours: number;
  reason?: string;
  location?: string;
  documents?: any[];
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  requiresDocument: boolean;
  maxDaysPerYear?: number;
  paidPercentage?: number;
  minNoticeHours?: number;
}

export interface LeaveRequest {
  id: string;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startAt: string;
  endAt: string;
  hours: number;
  status: LeaveStatus;
  reason?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  eventType: AttendanceEventType;
  timestamp: string;
  method: AttendanceMethod;
}
