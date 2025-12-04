import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockInDto } from '../dto/clock-in.dto';
import { ClockOutDto } from '../dto/clock-out.dto';
import { ScheduleService } from './schedule.service';
import { PolicyService } from './policy.service';
import { GpsValidationStrategy } from '../strategies/gps-validation.strategy';
import { IpValidationStrategy } from '../strategies/ip-validation.strategy';
import { AttendanceEventType } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
    private readonly policyService: PolicyService,
    private readonly gpsStrategy: GpsValidationStrategy,
    private readonly ipStrategy: IpValidationStrategy,
  ) {}

  async clockIn(userId: string, dto: ClockInDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) {
      throw new BadRequestException('Employee record not found for this user');
    }

    // Validate Policy
    const schedules = await this.prisma.attendanceSchedule.findMany({
      where: {
        OR: [
          { employeeId: employee.id },
          { departmentId: employee.departmentId },
        ],
      },
      include: { policy: true },
    });

    const activeSchedule = schedules.find(s => s.employeeId === employee.id) 
                        || schedules.find(s => s.departmentId === employee.departmentId);

    if (activeSchedule?.policy) {
      const { policy } = activeSchedule;

      // GPS Validation
      if (policy.geofence) {
        if (!dto.latitude || !dto.longitude) {
           throw new ForbiddenException('Location data is required by policy.');
        }
        if (!this.gpsStrategy.validate(dto.latitude, dto.longitude, policy.geofence)) {
           throw new ForbiddenException('You are outside the allowed clock-in area.');
        }
      }

      // IP Validation
      if (policy.ipAllowList && dto.ipAddress) {
         if (!this.ipStrategy.validate(dto.ipAddress, policy.ipAllowList)) {
            throw new ForbiddenException(`IP address ${dto.ipAddress} is not authorized.`);
         }
      }
    }
    
    const record = await this.prisma.attendanceRecord.create({
      data: {
        entityId: employee.entityId,
        employeeId: employee.id,
        eventType: AttendanceEventType.CLOCK_IN,
        method: dto.method,
        timestamp: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        ipAddress: dto.ipAddress,
        deviceInfo: dto.deviceInfo ?? undefined,
        photoUrl: dto.photoUrl,
        notes: dto.notes,
      },
    });

    // Update Daily Summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.attendanceDailySummary.upsert({
      where: {
        entityId_employeeId_workDate: {
          entityId: employee.entityId,
          employeeId: employee.id,
          workDate: today,
        },
      },
      update: {
        clockInTime: record.timestamp,
      },
      create: {
        entityId: employee.entityId,
        employeeId: employee.id,
        workDate: today,
        clockInTime: record.timestamp,
      },
    });

    return record;
  }

  async clockOut(userId: string, dto: ClockOutDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) {
      throw new BadRequestException('Employee record not found for this user');
    }

    // Validate Policy
    const schedules = await this.prisma.attendanceSchedule.findMany({
      where: {
        OR: [
          { employeeId: employee.id },
          { departmentId: employee.departmentId },
        ],
      },
      include: { policy: true },
    });

    const activeSchedule = schedules.find(s => s.employeeId === employee.id) 
                        || schedules.find(s => s.departmentId === employee.departmentId);

    if (activeSchedule?.policy) {
      const { policy } = activeSchedule;

      // GPS Validation
      if (policy.geofence) {
        if (!dto.latitude || !dto.longitude) {
           throw new ForbiddenException('Location data is required by policy.');
        }
        if (!this.gpsStrategy.validate(dto.latitude, dto.longitude, policy.geofence)) {
           throw new ForbiddenException('You are outside the allowed clock-out area.');
        }
      }

      // IP Validation
      if (policy.ipAllowList && dto.ipAddress) {
         if (!this.ipStrategy.validate(dto.ipAddress, policy.ipAllowList)) {
            throw new ForbiddenException(`IP address ${dto.ipAddress} is not authorized.`);
         }
      }
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        entityId: employee.entityId,
        employeeId: employee.id,
        eventType: AttendanceEventType.CLOCK_OUT,
        method: dto.method,
        timestamp: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        ipAddress: dto.ipAddress,
        deviceInfo: dto.deviceInfo ?? undefined,
        photoUrl: dto.photoUrl,
        notes: dto.notes,
      },
    });

    // Update Daily Summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate worked minutes (simplified)
    const summary = await this.prisma.attendanceDailySummary.findUnique({
      where: {
        entityId_employeeId_workDate: {
          entityId: employee.entityId,
          employeeId: employee.id,
          workDate: today,
        },
      },
    });

    let workedMinutes = 0;
    if (summary && summary.clockInTime) {
      const diffMs = record.timestamp.getTime() - summary.clockInTime.getTime();
      workedMinutes = Math.floor(diffMs / 60000);
    }

    await this.prisma.attendanceDailySummary.upsert({
      where: {
        entityId_employeeId_workDate: {
          entityId: employee.entityId,
          employeeId: employee.id,
          workDate: today,
        },
      },
      update: {
        clockOutTime: record.timestamp,
        workedMinutes: workedMinutes,
        status: 'completed', // Simplified status update
      },
      create: {
        entityId: employee.entityId,
        employeeId: employee.id,
        workDate: today,
        clockOutTime: record.timestamp,
        workedMinutes: 0,
        status: 'completed',
      },
    });

    return record;
  }

  async getDailySummaries(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.attendanceDailySummary.findMany({
      where: {
        workDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        employee: true,
      },
    });
  }
}
