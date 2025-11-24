import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly prisma: PrismaService) {}

  async suggestAccount(
    input: SuggestAccountInput,
  ): Promise<AccountSuggestionResult> {
    const appliedRules = new Set<string>();
    const candidates: SuggestionCandidate[] = [];

    const normalizedKeywords = (input.reimbursementItemKeywords || [])
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);
    const descriptionText = input.description.toLowerCase();
    const keywordMatched = normalizedKeywords.find((keyword) =>
      descriptionText.includes(keyword),
    );

    if (input.reimbursementItemAccountId) {
      const baseConfidence = keywordMatched ? 0.95 : 0.9;
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
}
