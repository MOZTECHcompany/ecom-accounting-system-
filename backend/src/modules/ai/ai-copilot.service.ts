import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from './ai.service';
import {
  AI_AGENT_CORE_PRINCIPLES,
  AI_AGENT_RESPONSE_STYLE,
} from './ai-principles';
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
${AI_AGENT_CORE_PRINCIPLES}

Role:
You are a Financial Copilot for an E-commerce Accounting System.

User Query: "${message}"
Current Date: ${dayjs().format('YYYY-MM-DD')}

Available Tools:
1. get_sales_stats(startDate: string, endDate: string) - Get total sales amount and count.
2. get_expense_stats(startDate: string, endDate: string, status?: string) - Get total expense amount and count. Status can be 'pending', 'approved', 'rejected', 'paid', 'draft'.
3. get_product_cost(productName: string) - Get the floating cost and stock info of a product.
4. get_bank_balances() - Get current balances of all bank accounts.
5. get_payroll_summary(month?: string) - Get total payroll cost for a specific month (YYYY-MM).
6. general_chat() - For greetings or questions not related to data.

Decision Rules:
- First understand the user's real goal.
- If system data is required, choose the single best tool for the job.
- If the user asks about product cost, price, or stock, use 'get_product_cost'.
- If the user asks about bank balance, cash, or money in bank, use 'get_bank_balances'.
- If the user asks about payroll, salaries, or employee costs, use 'get_payroll_summary'.
- Convert natural language dates into exact YYYY-MM-DD ranges.
- If no date is specified for sales or expenses, default to the current month through today.
- If the user asks for "pending" or "waiting" expenses, set status to 'pending'.
- If the request is greeting, chit-chat, or cannot be answered with current tools, use 'general_chat'.

Return JSON ONLY:
{ "tool": "TOOL_NAME", "params": { ... }, "reply": "Optional short conversational filler" }
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

    // 2. Permission Check & Execute Tool
    let toolResult = null;
    let toolData = null;

    // Check permissions for sensitive tools
    if (
      ['get_product_cost', 'get_bank_balances', 'get_payroll_summary'].includes(
        intent.tool,
      )
    ) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });

      const isSuperAdmin = user?.roles.some(
        (r) => r.role.code === 'SUPER_ADMIN',
      );

      if (!isSuperAdmin) {
        return {
          reply: `抱歉，您沒有權限查詢此敏感資訊 (${intent.tool})。此功能僅限超級管理員 (SUPER_ADMIN) 使用。`,
        };
      }
    }

    if (intent.tool === 'get_sales_stats') {
      toolData = await this.getSalesStats(
        entityId,
        intent.params.startDate,
        intent.params.endDate,
      );
      toolResult = `Sales: TWD ${toolData.total} (${toolData.count} orders)`;
    } else if (intent.tool === 'get_expense_stats') {
      toolData = await this.getExpenseStats(
        entityId,
        intent.params.startDate,
        intent.params.endDate,
        intent.params.status,
      );
      toolResult = `Expenses: TWD ${toolData.total} (${toolData.count} requests)`;
    } else if (intent.tool === 'get_product_cost') {
      toolData = await this.getProductCost(entityId, intent.params.productName);
      if (!toolData) {
        toolResult = `Product '${intent.params.productName}' not found.`;
      } else {
        toolResult = `Product: ${toolData.name} (${toolData.sku})\nFloating Cost: TWD ${toolData.movingAverageCost}\nLatest Purchase Price: TWD ${toolData.latestPurchasePrice}\nStock: ${toolData.stock} units`;
      }
    } else if (intent.tool === 'get_bank_balances') {
      toolData = await this.getBankBalances(entityId);
      toolResult = `Bank Balances:\n${toolData.map((b) => `- ${b.name}: ${b.currency} ${b.balance}`).join('\n')}`;
    } else if (intent.tool === 'get_payroll_summary') {
      toolData = await this.getPayrollSummary(entityId, intent.params.month);
      toolResult = `Payroll Summary for ${toolData.month}:\nTotal Cost: TWD ${toolData.totalCost}\nHeadcount: ${toolData.headcount}`;
    } else {
      // General chat
      return { reply: intent.reply || '您好！我是您的 AI 財務助手。' };
    }

    // 3. Generate Final Natural Language Response
    const finalPrompt = `
${AI_AGENT_CORE_PRINCIPLES}
${AI_AGENT_RESPONSE_STYLE}

User Query: "${message}"
Tool Result: "${toolResult}"

Task:
Answer the user's question directly based on the tool result.
Be concise, natural, and useful.
If the tool result is limited, say so honestly and give the simplest next step.
`;
    const finalReply = await this.aiService.generateContent(
      finalPrompt,
      modelId,
    );

    return {
      reply: finalReply || '數據查詢成功，但無法生成回應。',
      data: toolData,
    };
  }

  private async getSalesStats(
    entityId: string,
    startDate: string,
    endDate: string,
  ) {
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

  private async getExpenseStats(
    entityId: string,
    startDate: string,
    endDate: string,
    status?: string,
  ) {
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
      _sum: { amountOriginal: true },
      _count: { id: true },
    });
    return {
      total: data._sum.amountOriginal || 0,
      count: data._count.id || 0,
    };
  }

  private async getProductCost(entityId: string, productName: string) {
    // Fuzzy search for product
    const product = await this.prisma.product.findFirst({
      where: {
        entityId,
        OR: [
          { name: { contains: productName, mode: 'insensitive' } },
          { sku: { contains: productName, mode: 'insensitive' } },
        ],
      },
      include: {
        inventorySnapshots: true,
      },
    });

    if (!product) return null;

    const totalStock = product.inventorySnapshots.reduce(
      (sum, snap) => sum + Number(snap.qtyOnHand),
      0,
    );

    return {
      name: product.name,
      sku: product.sku,
      movingAverageCost: Number(product.movingAverageCost),
      latestPurchasePrice: Number(product.latestPurchasePrice),
      stock: totalStock,
    };
  }

  private async getBankBalances(entityId: string) {
    // Find Asset accounts that are likely Bank/Cash
    // In a real system, we would look for Account Type = ASSET and SubType = CASH/BANK
    // Here we look for accounts starting with '11' (Standard Chart of Accounts for Cash/Bank)
    const accounts = await this.prisma.account.findMany({
      where: {
        entityId,
        code: { startsWith: '11' },
      },
      include: {
        journalLines: true,
      },
    });

    return accounts.map((account) => {
      const balance = account.journalLines.reduce((sum, line) => {
        return sum + Number(line.debit) - Number(line.credit);
      }, 0);

      return {
        name: account.name,
        currency: 'TWD', // Simplified, should come from account or lines
        balance: balance,
      };
    });
  }

  private async getPayrollSummary(entityId: string, month?: string) {
    const targetMonth = month ? dayjs(month) : dayjs();
    const startOfMonth = targetMonth.startOf('month').toDate();
    const endOfMonth = targetMonth.endOf('month').toDate();

    const payrollRuns = await this.prisma.payrollRun.findMany({
      where: {
        entityId,
        periodStart: { gte: startOfMonth },
        periodEnd: { lte: endOfMonth },
      },
      include: {
        items: true,
      },
    });

    let totalCost = 0;
    let headcount = 0;

    for (const run of payrollRuns) {
      // Sum all items that are earnings or company contributions
      // We exclude employee deductions (INS_EMP_*) as they are part of Gross Pay (Earnings)
      // We exclude TAX_WITHHOLD for the same reason
      const runCost = run.items.reduce((sum, item) => {
        if (
          ['INS_EMP_LABOR', 'INS_EMP_HEALTH', 'TAX_WITHHOLD'].includes(
            item.type,
          )
        ) {
          return sum;
        }
        return sum + Number(item.amountBase);
      }, 0);

      totalCost += runCost;

      // Count unique employees in this run
      const uniqueEmployees = new Set(run.items.map((i) => i.employeeId));
      headcount += uniqueEmployees.size;
    }

    return {
      month: targetMonth.format('YYYY-MM'),
      totalCost,
      headcount,
    };
  }
}
