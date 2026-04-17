import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { ScheduleService } from './schedule.service';

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkDailyAnomalies() {
    this.logger.log('Starting daily anomaly check...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    await this.checkMissingClockOuts(yesterday);
    await this.checkLateArrivals(yesterday);
    await this.checkEarlyDepartures(yesterday);
  }

  async checkMissingClockOuts(date: Date) {
    this.logger.log(`Checking for missing clock-outs on ${date.toISOString().split('T')[0]}...`);
    
    const summaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        workDate: date,
        clockInTime: { not: null },
        clockOutTime: null,
      },
      include: { employee: true },
    });

    for (const summary of summaries) {
      this.logger.warn(`Missing clock-out for employee ${summary.employeeId}`);
      
      await this.createAnomaly(
        summary.entityId,
        summary.employeeId,
        summary.id,
        'MISSING_CLOCK_OUT',
        'high',
        'Employee clocked in but did not clock out.',
      );
    }
  }

  async checkLateArrivals(date: Date) {
    this.logger.log(`Checking for late arrivals on ${date.toISOString().split('T')[0]}...`);

    // Fetch summaries with schedules
    const summaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        workDate: date,
        clockInTime: { not: null },
      },
    });

    for (const summary of summaries) {
      const clockIn = summary.clockInTime;
      if (!clockIn) continue;

      const schedule = await this.scheduleService.getScheduleForDate(
        summary.employeeId,
        date,
      );

      if (schedule && clockIn > schedule.lateThreshold) {
        const diffMinutes = Math.floor(
          (clockIn.getTime() - schedule.shiftStartAt.getTime()) / 60000,
        );
        await this.createAnomaly(
          summary.entityId,
          summary.employeeId,
          summary.id,
          'LATE_ARRIVAL',
          'low',
          `Arrived ${diffMinutes} minutes late. Shift starts at ${schedule.shiftStart}.`,
        );
      }
    }
  }

  async checkEarlyDepartures(date: Date) {
    this.logger.log(`Checking for early departures on ${date.toISOString().split('T')[0]}...`);

    const summaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        workDate: date,
        clockOutTime: { not: null },
      },
    });

    for (const summary of summaries) {
      const clockOut = summary.clockOutTime;
      if (!clockOut) continue;

      const schedule = await this.scheduleService.getScheduleForDate(
        summary.employeeId,
        date,
      );

      if (schedule && clockOut < schedule.earlyLeaveThreshold) {
        const diffMinutes = Math.floor(
          (schedule.earlyLeaveThreshold.getTime() - clockOut.getTime()) / 60000,
        );
        await this.createAnomaly(
          summary.entityId,
          summary.employeeId,
          summary.id,
          'EARLY_DEPARTURE',
          'low',
          `Left ${diffMinutes} minutes early. Shift ends at ${schedule.shiftEnd}.`,
        );
      }
    }
  }

  private async createAnomaly(
    entityId: string,
    employeeId: string,
    summaryId: string,
    type: string,
    severity: string,
    note: string,
  ) {
    // Check if exists
    const existing = await this.prisma.attendanceAnomaly.findFirst({
      where: { summaryId, type },
    });

    if (!existing) {
      await this.prisma.attendanceAnomaly.create({
        data: {
          entityId,
          employeeId,
          summaryId,
          type,
          severity,
          detectedAt: new Date(),
          resolvedStatus: 'open',
          resolutionNote: note,
        },
      });

      // Send Notification
      const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (employee && employee.userId) {
        await this.notificationService.create({
          userId: employee.userId,
          title: 'Attendance Anomaly Detected',
          message: `Anomaly: ${type}. ${note}`,
          type: 'warning',
          category: 'attendance',
        });
      }
    }
  }
}
