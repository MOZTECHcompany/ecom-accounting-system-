import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPayrollRun(data: any) {
    return this.prisma.payrollRun.create({ data });
  }

  async findPayrollRuns(entityId: string) {
    return this.prisma.payrollRun.findMany({
      where: { entityId },
      include: { items: true },
      orderBy: { payDate: 'desc' },
    });
  }

  async createPayrollItem(data: any) {
    return this.prisma.payrollItem.create({ data });
  }
}
