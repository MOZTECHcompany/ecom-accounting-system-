// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private prisma: PrismaService) {}

  async getFinancialSummary(startDate: Date, endDate: Date) {
    return this.prisma.journalEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lines: true,
      },
    });
  }

  async getAccountBalances(asOfDate: Date) {
    return this.prisma.account.findMany({
      include: {
        journalLines: {
          where: {
            entry: {
              date: {
                lte: asOfDate,
              },
            },
          },
        },
      },
    });
  }

  async getTransactionsByAccount(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.prisma.journalLine.findMany({
      where: {
        accountId,
        ...(startDate &&
          endDate && {
            entry: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
      },
      include: {
        entry: true,
        account: true,
      },
      orderBy: {
        entry: {
          date: 'desc',
        },
      },
    });
  }
}
