import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ApRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInvoices(entityId?: string) {
    return this.prisma.apInvoice.findMany({
      where: entityId ? { entityId } : undefined,
      include: {
        vendor: true,
        entity: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async createInvoice(data: any) {
    return this.prisma.apInvoice.create({ data });
  }

  async recordPayment(invoiceId: string, data: any) {
    return this.prisma.apInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmountOriginal: { increment: data.amount },
        paidAmountBase: { increment: data.amount },
        status: data.newStatus || 'partial',
      },
    });
  }
}
