import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async findPaymentTasks(entityId?: string) {
    return this.prisma.paymentTask.findMany({
      where: {
        ...(entityId ? { entityId } : {}),
        status: { not: 'cancelled' },
      },
      include: {
        vendor: true,
        entity: true,
        expenseRequest: {
          select: {
            description: true,
            reimbursementItem: {
              select: { name: true },
            },
            creator: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPaymentTaskById(id: string) {
    return this.prisma.paymentTask.findUnique({ where: { id } });
  }

  async findBankAccount(id: string) {
    return this.prisma.bankAccount.findUnique({ where: { id } });
  }

  async updatePaymentTaskWithBankInfo(
    taskId: string,
    status: string,
    bankInfo?: { bankName: string; accountLast5: string },
  ) {
    const task = await this.prisma.paymentTask.update({
      where: { id: taskId },
      data: {
        status,
        paidDate: status === 'paid' ? new Date() : null,
      },
    });

    if (task.expenseRequestId && bankInfo) {
      await this.prisma.expenseRequest.update({
        where: { id: task.expenseRequestId },
        data: {
          paymentStatus: status,
          paymentMethod: 'bank_transfer',
        },
      });
    }
    return task;
  }

  async updatePaymentTaskStatus(taskId: string, status: string) {
    return this.prisma.paymentTask.update({
      where: { id: taskId },
      data: {
        status,
        paidDate: status === 'paid' ? new Date() : null,
      },
    });
  }

  async createInvoice(data: any) {
    return this.prisma.apInvoice.create({ data });
  }

  async createInvoicesBatch(data: Prisma.ApInvoiceUncheckedCreateInput[]) {
    if (!data.length) {
      return { created: 0 };
    }

    const result = await this.prisma.apInvoice.createMany({
      data,
      skipDuplicates: true,
    });
    return { created: result.count };
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

  async updateInvoice(id: string, data: Record<string, unknown>) {
    return this.prisma.apInvoice.update({
      where: { id },
      data,
    });
  }

  async getInvoiceAlerts(entityId?: string) {
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    const baseWhere = entityId ? { entityId } : {};
    const unpaidStatuses = ['pending', 'partial', 'overdue'];

    const [unpaid, overdue, upcoming] = await Promise.all([
      this.prisma.apInvoice.count({
        where: {
          ...baseWhere,
          status: { in: unpaidStatuses },
        },
      }),
      this.prisma.apInvoice.count({
        where: {
          ...baseWhere,
          OR: [
            { status: 'overdue' },
            {
              status: { in: ['pending', 'partial'] },
              dueDate: { lt: now },
            },
          ],
        },
      }),
      this.prisma.apInvoice.count({
        where: {
          ...baseWhere,
          status: { in: ['pending', 'partial'] },
          dueDate: {
            gte: now,
            lte: sevenDaysLater,
          },
        },
      }),
    ]);

    return { unpaid, overdue, upcoming };
  }
}
