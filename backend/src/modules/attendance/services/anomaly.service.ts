import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkMissingClockOuts() {
    this.logger.log('Checking for missing clock-outs...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const summaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        workDate: yesterday,
        clockInTime: { not: null },
        clockOutTime: null,
      },
    });

    for (const summary of summaries) {
      this.logger.warn(`Missing clock-out for employee ${summary.employeeId} on ${summary.workDate}`);
      
      await this.prisma.attendanceAnomaly.create({
        data: {
          entityId: summary.entityId,
          employeeId: summary.employeeId,
          summaryId: summary.id,
          type: 'MISSING_CLOCK_OUT',
          severity: 'medium',
          detectedAt: new Date(),
          resolvedStatus: 'open',
        },
      });
    }
  }
}
