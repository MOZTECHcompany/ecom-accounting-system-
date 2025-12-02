import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from './ai.service';
import dayjs from 'dayjs';

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async processChat(
    entityId: string,
    userId: string,
    message: string,
    modelId?: string,
  ): Promise<{ reply: string; data?: any }> {
    // 1. Intent Classification & Parameter Extraction
    const prompt = `
You are a Financial Copilot for an E-commerce Accounting System.
User Query: "${message}"
Current Date: ${dayjs().format('YYYY-MM-DD')}

Available Tools:
1. get_sales_stats(startDate: string, endDate: string) - Get total sales amount and count.
2. get_expense_stats(startDate: string, endDate: string, status?: string) - Get total expense amount and count. Status can be 'pending', 'approved', 'rejected', 'paid', 'draft'.
3. general_chat() - For greetings or questions not related to data.

Instructions:
1. Determine the user's intent.
2. If they ask for data (sales, expenses, "last month", "yesterday"), map to a tool.
3. Calculate start/end dates based on natural language (e.g., "last month" -> 2025-11-01 to 2025-11-30).
4. If no date is specified, default to the current month (start of month to today).
5. If the user asks for "pending" or "waiting" expenses, set status to 'pending'.
6. Return JSON ONLY: { "tool": "TOOL_NAME", "params": { ... }, "reply": "Optional conversational filler" }
`;

    const aiResponse = await this.aiService.generateContent(prompt, modelId);
    const intent = this.aiService.parseJsonOutput<{
      tool: string;
      params: any;
      reply?: string;
    }>(aiResponse || '{}');

    if (!intent || !intent.tool) {
      return { reply: '抱歉，我暫時無法理解您的需求。' };
    }

    // 2. Execute Tool
    let toolResult = null;
    let toolData = null;

    if (intent.tool === 'get_sales_stats') {
      toolData = await this.getSalesStats(entityId, intent.params.startDate, intent.params.endDate);
      toolResult = `Sales: TWD ${toolData.total} (${toolData.count} orders)`;
    } else if (intent.tool === 'get_expense_stats') {
      toolData = await this.getExpenseStats(entityId, intent.params.startDate, intent.params.endDate, intent.params.status);
      toolResult = `Expenses: TWD ${toolData.total} (${toolData.count} requests)`;
    } else {
      // General chat
      return { reply: intent.reply || '您好！我是您的 AI 財務助手。' };
    }

    // 3. Generate Final Natural Language Response
    const finalPrompt = `
User Query: "${message}"
Tool Result: "${toolResult}"

Task: Answer the user's question in Traditional Chinese based on the tool result.
Keep it professional and concise.
`;
    const finalReply = await this.aiService.generateContent(finalPrompt, modelId);

    return {
      reply: finalReply || '數據查詢成功，但無法生成回應。',
      data: toolData,
    };
  }

  private async getSalesStats(entityId: string, startDate: string, endDate: string) {
    const data = await this.prisma.salesOrder.aggregate({
      where: {
        entityId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      _sum: { totalGrossBase: true },
      _count: { id: true },
    });
    return {
      total: data._sum.totalGrossBase || 0,
      count: data._count.id || 0,
    };
  }

  private async getExpenseStats(entityId: string, startDate: string, endDate: string, status?: string) {
    const where: any = {
      entityId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (status) {
      where.status = status;
    }

    const data = await this.prisma.expenseRequest.aggregate({
      where,
      _sum: { amountBase: true },
      _count: { id: true },
    });
    return {
      total: data._sum.amountBase || 0,
      count: data._count.id || 0,
    };
  }
}
