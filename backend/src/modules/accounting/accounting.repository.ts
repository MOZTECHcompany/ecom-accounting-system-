import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AccountingRepository
 * 會計資料存取層
 *
 * 職責：
 * - 封裝所有與會計相關的資料庫操作
 * - 提供可重用的查詢方法
 * - 隔離 Prisma 實作細節
 */
@Injectable()
export class AccountingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查詢會計科目
   */
  async findAccountsByEntity(
    entityId: string,
    filters?: { type?: string; isActive?: boolean },
  ) {
    return this.prisma.account.findMany({
      where: {
        entityId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 根據科目代號查詢科目
   */
  async findAccountByCode(entityId: string, code: string) {
    return this.prisma.account.findUnique({
      where: {
        entityId_code: {
          entityId,
          code,
        },
      },
    });
  }

  /**
   * 建立會計分錄
   */
  async createJournalEntry(data: {
    entityId: string;
    date: Date;
    description: string;
    sourceModule?: string;
    sourceId?: string;
    periodId?: string;
    createdBy: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      currency?: string;
      fxRate?: number;
      amountBase: number;
      memo?: string;
    }>;
  }) {
    return this.prisma.journalEntry.create({
      data: {
        entityId: data.entityId,
        date: data.date,
        description: data.description,
        sourceModule: data.sourceModule,
        sourceId: data.sourceId,
        periodId: data.periodId,
        createdBy: data.createdBy,
        journalLines: {
          create: data.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            currency: line.currency || 'TWD',
            fxRate: line.fxRate || 1,
            amountBase: line.amountBase,
            memo: line.memo,
          })),
        },
      },
      include: {
        journalLines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  /**
   * 查詢會計期間
   */
  async findPeriods(entityId: string, filters?: { status?: string }) {
    return this.prisma.period.findMany({
      where: {
        entityId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 查詢當前開放期間
   */
  async findCurrentOpenPeriod(entityId: string) {
    return this.prisma.period.findFirst({
      where: {
        entityId,
        status: 'open',
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 更新期間狀態
   */
  async updatePeriodStatus(periodId: string, status: string) {
    return this.prisma.period.update({
      where: { id: periodId },
      data: { status },
    });
  }

  /**
   * 查詢總分類帳資料
   */
  async findGeneralLedgerEntries(
    entityId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string,
  ) {
    return this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          entityId,
          date: {
            gte: startDate,
            lte: endDate,
          },
          approvedAt: { not: null }, // 只查已審核分錄
        },
        ...(accountId && { accountId }),
      },
      include: {
        account: true,
        journalEntry: true,
      },
      orderBy: [
        { journalEntry: { date: 'asc' } },
        { account: { code: 'asc' } },
      ],
    });
  }
}
