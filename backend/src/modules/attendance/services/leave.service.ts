import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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

    // Notify Employee
    await this.notificationService.create({
      userId: userId,
      title: 'Leave Request Submitted',
      message: `Your leave request for ${dto.hours} hours has been submitted.`,
      type: 'LEAVE_REQUEST',
      category: 'ATTENDANCE',
      data: { entityId: employee.entityId },
    });

    // TODO: Notify Manager (Need hierarchy logic)

    return leaveRequest;
  }

  async updateLeaveStatus(requestId: string, status: LeaveStatus, reviewerId: string) {
    const request = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status },
      include: { employee: true },
    });

    if (request.employee?.userId) {
      await this.notificationService.create({
        userId: request.employee.userId,
        title: `Leave Request ${status}`,
        message: `Your leave request has been ${status.toLowerCase()}.`,
        type: 'LEAVE_STATUS_UPDATE',
        category: 'ATTENDANCE',
        data: { entityId: request.entityId },
      });
    }

    return request;
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
