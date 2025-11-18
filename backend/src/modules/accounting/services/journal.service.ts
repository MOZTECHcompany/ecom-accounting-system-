import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * JournalService
 * 會計分錄服務，處理分錄的建立、查詢、審核等功能
 * 
 * 核心職責：
 * - 產生會計分錄（借貸平衡驗證）
 * - 分錄查詢與追蹤
 * - 分錄審核流程
 * - 期間鎖定檢查
 * 
 * 重要原則：
 * - 所有模組（銷售、進貨、人事等）最終都要透過此服務產生分錄
 * - 分錄必須借貸平衡（debit = credit）
 * - 已關閉/鎖定期間不可新增或修改分錄
 */
@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 建立會計分錄
   * @param data - 分錄資料
   * @returns 建立的分錄
   * 
   * @example
   * ```typescript
   * // 銷售收入分錄
   * await journalService.createJournalEntry({
   *   entityId: 'entity-id',
   *   date: new Date(),
   *   description: '銷售訂單 #12345',
   *   sourceModule: 'sales',
   *   sourceId: 'order-id',
   *   createdBy: 'user-id',
   *   lines: [
   *     { accountId: 'ar-account-id', debit: 10000, credit: 0, amountBase: 10000 },
   *     { accountId: 'revenue-account-id', debit: 0, credit: 10000, amountBase: 10000 },
   *   ],
   * });
   * ```
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
    // 驗證借貸平衡
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + Number(line.debit),
      0,
    );
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + Number(line.credit),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      );
    }

    // 如果指定了期間，檢查期間是否可編輯
    if (data.periodId) {
      const period = await this.prisma.period.findUnique({
        where: { id: data.periodId },
      });

      if (period && period.status !== 'open') {
        throw new ForbiddenException(
          `Cannot create journal entry in ${period.status} period`,
        );
      }
    }

    // 建立分錄
    const journalEntry = await this.prisma.journalEntry.create({
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
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
            currency: line.currency || 'TWD',
            fxRate: new Prisma.Decimal(line.fxRate || 1),
            amountBase: new Prisma.Decimal(line.amountBase),
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

    this.logger.log(
      `Created journal entry ${journalEntry.id} for ${data.sourceModule}:${data.sourceId}`,
    );

    return journalEntry;
  }

  /**
   * 查詢指定來源的分錄
   * @param sourceModule - 來源模組
   * @param sourceId - 來源單據 ID
   */
  async getJournalEntriesBySource(sourceModule: string, sourceId: string) {
    return this.prisma.journalEntry.findMany({
      where: {
        sourceModule,
        sourceId,
      },
      include: {
        journalLines: {
          include: {
            account: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * 查詢指定期間與實體的所有分錄
   */
  async getJournalEntriesByPeriod(entityId: string, periodId?: string) {
    return this.prisma.journalEntry.findMany({
      where: {
        entityId,
        ...(periodId && { periodId }),
      },
      include: {
        journalLines: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * 審核分錄
   * @param journalEntryId - 分錄 ID
   * @param approvedBy - 審核者 ID
   */
  async approveJournalEntry(journalEntryId: string, approvedBy: string) {
    return this.prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }
}
