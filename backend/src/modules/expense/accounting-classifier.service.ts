import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export interface SuggestAccountInput {
  entityId: string;
  description: string;
  amountOriginal: number;
  amountCurrency?: string;
  reimbursementItemId?: string;
  reimbursementItemKeywords?: string[];
  reimbursementItemAccountId?: string;
  vendorId?: string;
  departmentId?: string;
  receiptType?: string;
  metadata?: Record<string, unknown>;
  model?: string;
}

export interface AccountSuggestionResult {
  accountId?: string;
  confidence: number;
  source: string;
  appliedRules: string[];
  features: Record<string, unknown>;
}

interface SuggestionCandidate {
  accountId: string;
  confidence: number;
  source: string;
  rule: string;
}

@Injectable()
export class AccountingClassifierService {
  private readonly logger = new Logger(AccountingClassifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) {}

  async suggestAccount(
    input: SuggestAccountInput,
  ): Promise<AccountSuggestionResult> {
    const appliedRules = new Set<string>();
    const candidates: SuggestionCandidate[] = [];

    // 1. AI Classification (Gemini)
    if (input.description) {
      try {
        const aiSuggestion = await this.classifyWithGemini(
          input.entityId,
          input.description,
          input.model,
        );
        if (aiSuggestion) {
          appliedRules.add('ai_gemini');
          candidates.push({
            accountId: aiSuggestion.accountId,
            confidence: aiSuggestion.confidence,
            source: 'ai_gemini',
            rule: 'ai_gemini',
          });
        }
      } catch (error) {
        this.logger.error(`Gemini AI classification failed: ${error}`);
      }
    }

    const normalizedKeywords = (input.reimbursementItemKeywords || [])
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);
    const descriptionText = input.description.toLowerCase();
    const keywordMatched = normalizedKeywords.find((keyword) =>
      descriptionText.includes(keyword),
    );

    if (input.reimbursementItemAccountId) {
      // If keywords match, we are very sure (0.95).
      // If no keywords match, we lower confidence to allow AI to override if it finds a better match (0.6).
      const baseConfidence = keywordMatched ? 0.95 : 0.6;
      appliedRules.add(
        keywordMatched
          ? 'reimbursement_item_keyword_match'
          : 'reimbursement_item_default',
      );
      candidates.push({
        accountId: input.reimbursementItemAccountId,
        confidence: baseConfidence,
        source: keywordMatched ? 'keyword_rule' : 'reimbursement_item_default',
        rule: keywordMatched ? 'keyword_rule' : 'reimbursement_item_default',
      });
    }

    if (input.vendorId) {
      const vendorAccount = await this.findLatestVendorDecision(
        input.entityId,
        input.vendorId,
      );
      if (vendorAccount) {
        appliedRules.add('vendor_history');
        candidates.push({
          accountId: vendorAccount,
          confidence: 0.82,
          source: 'vendor_history',
          rule: 'vendor_history',
        });
      }
    }

    if (input.reimbursementItemId) {
      const frequentAccount = await this.findFrequentAccountForItem(
        input.reimbursementItemId,
      );
      if (frequentAccount) {
        appliedRules.add('item_history');
        candidates.push({
          accountId: frequentAccount,
          confidence: 0.78,
          source: 'item_history',
          rule: 'item_history',
        });
      }
    }

    const sorted = candidates.sort((a, b) => b.confidence - a.confidence);
    const best = sorted[0];

    const result: AccountSuggestionResult = {
      accountId: best?.accountId,
      confidence: best?.confidence ?? 0.35,
      source: best?.source ?? 'insufficient_signals',
      appliedRules: Array.from(appliedRules),
      features: {
        amountOriginal: input.amountOriginal,
        amountCurrency: input.amountCurrency ?? 'TWD',
        reimbursementItemId: input.reimbursementItemId ?? null,
        vendorId: input.vendorId ?? null,
        departmentId: input.departmentId ?? null,
        keywordMatched: keywordMatched ?? null,
        ruleCount: appliedRules.size,
        descriptionLength: input.description.length,
        metadataKeys: Object.keys(input.metadata ?? {}),
      },
    };

    if (!best) {
      this.logger.debug(
        `No strong signals for expense request in entity ${input.entityId}`,
      );
    }

    return result;
  }

  private async findLatestVendorDecision(entityId: string, vendorId: string) {
    const record = await this.prisma.expenseRequest.findFirst({
      where: {
        entityId,
        vendorId,
        finalAccountId: { not: null },
      },
      orderBy: [{ approvedAt: 'desc' }, { updatedAt: 'desc' }],
      select: { finalAccountId: true },
    });

    return record?.finalAccountId ?? undefined;
  }

  private async findFrequentAccountForItem(reimbursementItemId: string) {
    try {
      const records = await this.prisma.expenseRequest.findMany({
        where: {
          reimbursementItemId,
          finalAccountId: { not: null },
        },
        select: { finalAccountId: true },
      });

      if (!records.length) {
        return undefined;
      }

      const frequency = records.reduce<Record<string, number>>((acc, record) => {
        if (!record.finalAccountId) {
          return acc;
        }
        acc[record.finalAccountId] = (acc[record.finalAccountId] ?? 0) + 1;
        return acc;
      }, {});

      const [topAccount] = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
      return topAccount?.[0];
    } catch (error) {
      this.logger.warn(
        `Failed to compute frequent account for reimbursement item ${reimbursementItemId}: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  async suggestReimbursementItem(
    entityId: string,
    description: string,
    model: string = 'gemini-2.0-flash',
  ): Promise<{ itemId: string; confidence: number; amount?: number } | null> {
    // 1. Fetch active reimbursement items
    const items = await this.prisma.reimbursementItem.findMany({
      where: {
        entityId,
        isActive: true,
      },
      select: { id: true, name: true, description: true, keywords: true },
    });

    if (items.length === 0) return null;

    const itemListText = items
      .map(
        (i) =>
          `- ${i.name} (${i.description || ''}) [Keywords: ${i.keywords || ''}] [ID: ${i.id}]`,
      )
      .join('\n');

    const prompt = `
You are an expert accountant assisting employees with expense reimbursement.
Analyze the following expense description and select the most appropriate Reimbursement Item from the list below.
Also, extract the expense amount from the description if present.

Expense Description: "${description}"

Available Reimbursement Items:
${itemListText}

Instructions:
1. Select the best matching item based on the description and keywords.
2. Even if the description is short (e.g. "taxi", "lunch", "pen"), try to match it to the most logical item (e.g. "Travel", "Meals", "Office Supplies").
3. Extract the expense amount from the description. Look for numbers that represent the cost.
4. Return the result in JSON format: { "itemId": "THE_ID", "confidence": 0.95, "amount": 500 }
5. Confidence should be between 0.0 and 1.0. If the match is weak, use a lower confidence.
6. If no item is suitable, return null.
7. If no amount is found, set "amount" to null.
8. Do not include any markdown formatting or explanation, just the raw JSON string.
`;

    try {
      const text = await this.aiService.generateContent(prompt, model);
      if (!text) return null;

      const result = this.aiService.parseJsonOutput<{ itemId: string; confidence: number; amount?: number }>(text);

      if (result && result.itemId && typeof result.confidence === 'number') {
        const exists = items.find((i) => i.id === result.itemId);
        if (exists) {
          return { itemId: result.itemId, confidence: result.confidence, amount: result.amount };
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error calling Gemini API for item suggestion', error);
      return null;
    }
  }

  private async classifyWithGemini(
    entityId: string,
    description: string,
    model: string = 'gemini-2.0-flash',
  ): Promise<{ accountId: string; confidence: number } | null> {
    // 1. Fetch active expense accounts
    const accounts = await this.prisma.account.findMany({
      where: {
        entityId,
        isActive: true,
      },
      select: { id: true, code: true, name: true, description: true },
    });

    if (accounts.length === 0) return null;

    const accountListText = accounts
      .map((a) => `- ${a.code} ${a.name} (${a.description || ''}) [ID: ${a.id}]`)
      .join('\n');

    const prompt = `
You are an expert accountant.
Analyze the following expense description and select the most appropriate accounting account from the list below.

Expense Description: "${description}"

Available Accounts:
${accountListText}

Instructions:
1. Select the best matching account based on the description.
2. Even if the description is short or informal, try to infer the correct account (e.g. "taxi" -> "Travel Expense", "server" -> "IT Expense").
3. Return the result in JSON format: { "accountId": "THE_ID", "confidence": 0.95 }
4. Confidence should be between 0.0 and 1.0.
5. If no account is suitable, return null.
6. Do not include any markdown formatting or explanation, just the JSON string.
`;

    try {
      const text = await this.aiService.generateContent(prompt, model);
      if (!text) return null;

      const result = this.aiService.parseJsonOutput<{ accountId: string; confidence: number }>(text);

      if (result && result.accountId && typeof result.confidence === 'number') {
        // Verify account exists
        const exists = accounts.find((a) => a.id === result.accountId);
        if (exists) {
          return { accountId: result.accountId, confidence: result.confidence };
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error calling Gemini API', error);
      return null;
    }
  }
}
