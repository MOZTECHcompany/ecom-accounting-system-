import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async createLeaveRequest(userId: string, dto: CreateLeaveRequestDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) {
      throw new BadRequestException('Employee record not found for this user');
    }

    // TODO: Validate balance
    // TODO: Validate notice period
    // TODO: Validate documents

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        entityId: employee.entityId,
        employeeId: employee.id,
        leaveTypeId: dto.leaveTypeId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        hours: dto.hours,
        reason: dto.reason,
        location: dto.location,
        status: LeaveStatus.SUBMITTED,
      },
    });

    return leaveRequest;
  }

  async getLeaveRequests(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) {
      throw new BadRequestException('Employee record not found for this user');
    }

    return this.prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
