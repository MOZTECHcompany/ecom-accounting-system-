import { Injectable } from '@nestjs/common';
import { AttendancePolicy } from '@prisma/client';
import { ScheduleService } from './schedule.service';

export type ResolvedAttendancePolicy = {
  id: string;
  name: string;
  type: string;
  requiresPhoto: boolean;
  maxEarlyClock: number;
  maxLateClock: number;
  ipAllowList: unknown;
  geofence: unknown;
};

@Injectable()
export class PolicyService {
  constructor(private readonly scheduleService: ScheduleService) {}

  async getPolicyForEmployee(employeeId: string, date: Date = new Date()) {
    const schedule = await this.scheduleService.getScheduleForDate(employeeId, date);
    return this.resolvePolicy(schedule?.policy);
  }

  resolvePolicy(
    policy?: AttendancePolicy | null,
  ): ResolvedAttendancePolicy | null {
    if (!policy) {
      return null;
    }

    return {
      id: policy.id,
      name: policy.name,
      type: policy.type,
      requiresPhoto: policy.requiresPhoto,
      maxEarlyClock: policy.maxEarlyClock,
      maxLateClock: policy.maxLateClock,
      ipAllowList: policy.ipAllowList,
      geofence: policy.geofence,
    };
  }
}
