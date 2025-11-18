import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AccountingService
 * 會計服務，處理會計科目相關的業務邏輯
 */
@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查詢指定實體的會計科目表
   * @param entityId - 公司實體 ID
   * @param type - 科目類型篩選（可選）
   */
  async getAccountsByEntity(entityId: string, type?: string) {
    return this.prisma.account.findMany({
      where: {
        entityId,
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [{ code: 'asc' }],
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * 根據科目代號查詢科目
   */
  async getAccountByCode(entityId: string, code: string) {
    const account = await this.prisma.account.findUnique({
      where: {
        entityId_code: {
          entityId,
          code,
        },
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Account with code ${code} not found for entity ${entityId}`,
      );
    }

    return account;
  }

  /**
   * 查詢會計期間
   * @param entityId - 公司實體 ID
   * @param status - 期間狀態篩選（可選）
   */
  async getPeriods(entityId: string, status?: string) {
    return this.prisma.period.findMany({
      where: {
        entityId,
        ...(status && { status }),
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 取得當前開放的會計期間
   */
  async getCurrentOpenPeriod(entityId: string) {
    return this.prisma.period.findFirst({
      where: {
        entityId,
        status: 'open',
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 檢查期間是否可編輯
   */
  async isPeriodEditable(periodId: string): Promise<boolean> {
    const period = await this.prisma.period.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }

    // closed 或 locked 的期間不可編輯
    return period.status === 'open';
  }
}
