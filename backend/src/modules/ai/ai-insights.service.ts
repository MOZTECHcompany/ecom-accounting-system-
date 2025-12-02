import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from './ai.service';
import * as dayjs from 'dayjs';

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getDailyBriefing(entityId: string, modelId?: string): Promise<string> {
    const yesterday = dayjs().subtract(1, 'day').startOf('day').toDate();
    const today = dayjs().startOf('day').toDate();

    // 1. Gather Data (Direct Prisma for performance/avoiding circular deps)
    const [salesData, expenseData] = await Promise.all([
      this.prisma.salesOrder.aggregate({
        where: {
          entityId,
          createdAt: { gte: yesterday, lt: today },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.expenseRequest.aggregate({
        where: {
          entityId,
          createdAt: { gte: yesterday, lt: today },
        },
        _sum: { amountOriginal: true },
        _count: { id: true },
      }),
    ]);

    const salesTotal = salesData._sum.totalAmount || 0;
    const salesCount = salesData._count.id || 0;
    const expenseTotal = expenseData._sum.amountOriginal || 0;
    const expenseCount = expenseData._count.id || 0;

    // 2. Generate Prompt
    const prompt = `
You are a CFO assistant. Analyze yesterday's financial data for the dashboard.
Data:
- Date: ${dayjs(yesterday).format('YYYY-MM-DD')}
- Total Sales: TWD ${salesTotal} (${salesCount} orders)
- Total Expenses: TWD ${expenseTotal} (${expenseCount} requests)

Task:
Write a concise, one-sentence "Daily Financial Insight" in Traditional Chinese (Taiwan).
Highlight the net flow (Sales - Expenses) and mention if it was a busy day or quiet day.
Tone: Professional, encouraging, and insightful.
Max length: 50 words.
`;

    // 3. Call AI
    const insight = await this.aiService.generateContent(prompt, modelId);
    return insight?.trim() || '昨日財務數據處理中，請稍後再試。';
  }

  async checkExpenseAnomaly(
    entityId: string,
    amount: number,
    reimbursementItemId: string,
    modelId?: string,
  ): Promise<{ isAnomaly: boolean; reason?: string }> {
    // 1. Get historical average for this item
    const stats = await this.prisma.expenseRequest.aggregate({
      where: {
        entityId,
        reimbursementItemId,
        status: 'approved',
      },
      _avg: { amountOriginal: true },
      _count: { id: true },
    });

    const avgAmount = stats._avg.amountOriginal || 0;
    const count = stats._count.id || 0;

    // Not enough data to judge
    if (count < 5) return { isAnomaly: false };

    // Simple Rule: > 200% of average
    if (amount > avgAmount * 2) {
      return {
        isAnomaly: true,
        reason: `金額 TWD ${amount} 顯著高於歷史平均 (TWD ${avgAmount.toFixed(0)})`,
      };
    }

    // AI Check for context (optional, if description provided)
    // For now, rule-based is faster and cheaper for "Anomaly"
    return { isAnomaly: false };
  }
}
