import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

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
  private readonly geminiApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  async suggestAccount(
    input: SuggestAccountInput,
  ): Promise<AccountSuggestionResult> {
    const appliedRules = new Set<string>();
    const candidates: SuggestionCandidate[] = [];

    // 1. AI Classification (Gemini)
    if (this.geminiApiKey && input.description) {
      try {
        const aiSuggestion = await this.classifyWithGemini(
          input.entityId,
          input.description,
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

  private async classifyWithGemini(
    entityId: string,
    description: string,
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
1. Select the best matching account.
2. Return the result in JSON format: { "accountId": "THE_ID", "confidence": 0.95 }
3. Confidence should be between 0.0 and 1.0.
4. If no account is suitable, return null.
5. Do not include any markdown formatting or explanation, just the JSON string.
`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) return null;

      // Clean up markdown code blocks if present
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(jsonString);

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
