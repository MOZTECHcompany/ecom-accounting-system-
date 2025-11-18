import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createApprovalRequest(data: any) {
    return this.prisma.approvalRequest.create({ data });
  }

  async findPendingByApprover(approverId: string) {
    return this.prisma.approvalRequest.findMany({
      where: {
        approverId,
        status: 'PENDING',
      },
    });
  }

  async updateStatus(id: string, status: string, comment?: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { status, remark: comment },
    });
  }
}
