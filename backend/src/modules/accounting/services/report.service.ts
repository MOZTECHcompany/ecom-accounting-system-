import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * ReportService
 * 財務報表服務
 * 
 * 功能：
 * - 損益表（Income Statement）
 * - 資產負債表（Balance Sheet）
 * - 現金流量表（Cash Flow Statement）- 簡化版
 * - 權益變動表（Statement of Changes in Equity）
 * 
 * 設計原則：
 * - 所有報表資料來源於 journal_lines
 * - 支援多公司實體
 * - 支援日期區間篩選
 * - 未來可擴充：依渠道、成本中心等維度篩選
 */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 產生損益表
   * @param entityId - 公司實體 ID
   * @param startDate - 開始日期
   * @param endDate - 結束日期
   * @returns 損益表資料
   * 
   * 邏輯：
   * - 收入類科目：credit - debit
   * - 費用類科目：debit - credit
   * - 淨利 = 總收入 - 總費用
   */
  async getIncomeStatement(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.log(
      `Generating income statement for entity ${entityId} from ${startDate} to ${endDate}`,
    );

    // 查詢所有相關的會計分錄明細
    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          entityId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        account: {
          type: {
            in: ['revenue', 'expense'],
          },
        },
      },
      include: {
        account: true,
      },
    });

    // 分組彙總
    const revenues: Record<string, any> = {};
    const expenses: Record<string, any> = {};

    for (const line of journalLines) {
      const account = line.account;
      const amount =
        Number(line.credit) - Number(line.debit); // revenue 通常在 credit

      if (account.type === 'revenue') {
        if (!revenues[account.code]) {
          revenues[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        }
        revenues[account.code].amount += amount;
      } else if (account.type === 'expense') {
        if (!expenses[account.code]) {
          expenses[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        }
        // expense 通常在 debit，所以要反轉
        expenses[account.code].amount += Math.abs(amount);
      }
    }

    const revenueItems = Object.values(revenues);
    const expenseItems = Object.values(expenses);

    const totalRevenue = revenueItems.reduce(
      (sum, item: any) => sum + item.amount,
      0,
    );
    const totalExpense = expenseItems.reduce(
      (sum, item: any) => sum + item.amount,
      0,
    );
    const netIncome = totalRevenue - totalExpense;

    return {
      entityId,
      startDate,
      endDate,
      revenues: revenueItems,
      expenses: expenseItems,
      totalRevenue,
      totalExpense,
      netIncome,
    };
  }

  /**
   * 產生資產負債表
   * @param entityId - 公司實體 ID
   * @param asOfDate - 截止日期
   * @returns 資產負債表資料
   * 
   * 邏輯：
   * - 資產類：debit - credit
   * - 負債類：credit - debit
   * - 權益類：credit - debit
   * - 總資產 = 總負債 + 總權益
   */
  async getBalanceSheet(entityId: string, asOfDate: Date) {
    this.logger.log(
      `Generating balance sheet for entity ${entityId} as of ${asOfDate}`,
    );

    // 查詢截止日期前的所有分錄明細
    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          entityId,
          date: {
            lte: asOfDate,
          },
        },
        account: {
          type: {
            in: ['asset', 'liability', 'equity'],
          },
        },
      },
      include: {
        account: true,
      },
    });

    // 分組彙總
    const assets: Record<string, any> = {};
    const liabilities: Record<string, any> = {};
    const equity: Record<string, any> = {};

    for (const line of journalLines) {
      const account = line.account;
      const debit = Number(line.debit);
      const credit = Number(line.credit);

      if (account.type === 'asset') {
        if (!assets[account.code]) {
          assets[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        }
        assets[account.code].amount += debit - credit;
      } else if (account.type === 'liability') {
        if (!liabilities[account.code]) {
          liabilities[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        }
        liabilities[account.code].amount += credit - debit;
      } else if (account.type === 'equity') {
        if (!equity[account.code]) {
          equity[account.code] = {
            code: account.code,
            name: account.name,
            amount: 0,
          };
        }
        equity[account.code].amount += credit - debit;
      }
    }

    const assetItems = Object.values(assets);
    const liabilityItems = Object.values(liabilities);
    const equityItems = Object.values(equity);

    const totalAssets = assetItems.reduce(
      (sum, item: any) => sum + item.amount,
      0,
    );
    const totalLiabilities = liabilityItems.reduce(
      (sum, item: any) => sum + item.amount,
      0,
    );
    const totalEquity = equityItems.reduce(
      (sum, item: any) => sum + item.amount,
      0,
    );

    return {
      entityId,
      asOfDate,
      assets: assetItems,
      liabilities: liabilityItems,
      equity: equityItems,
      totalAssets,
      totalLiabilities,
      totalEquity,
      difference: totalAssets - (totalLiabilities + totalEquity),
    };
  }
}
