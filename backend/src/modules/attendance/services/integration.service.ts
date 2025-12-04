import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AttendanceIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayrollData(employeeId: string, start: Date, end: Date) {
    // 1. Get Daily Summaries
    const summaries = await this.prisma.attendanceDailySummary.findMany({
      where: {
        employeeId,
        workDate: {
          gte: start,
          lte: end,
        },
      },
    });

    // 2. Get Approved Leaves
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startAt: { gte: start },
        endAt: { lte: end },
      },
      include: { leaveType: true },
    });

    // 3. Calculate Totals
    let regularHours = 0;
    let overtimeHours = 0;
    let leaveHours = 0;

    for (const summary of summaries) {
      if (summary.workHours) regularHours += summary.workHours;
      if (summary.overtimeHours) overtimeHours += summary.overtimeHours;
    }

    for (const leave of leaves) {
      leaveHours += leave.hours;
    }

    return {
      employeeId,
      period: { start, end },
      regularHours,
      overtimeHours,
      leaveHours,
      details: {
        daysWorked: summaries.length,
        leavesTaken: leaves.length,
      },
    };
  }
}
