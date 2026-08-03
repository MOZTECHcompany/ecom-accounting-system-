import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  requireCanonicalAdsCurrency,
  summarizeAdsSpend,
} from '../ads-currency';
import {
  AdsBrandMappingResolution,
  resolveConfiguredAdsBrandMapping,
  summarizeAdsBrandMappingCoverage,
} from '../ads-brand-mapping';
import {
  MetaAdsAccountConfig,
  MetaAdsAdAccount,
  MetaAdsAdapter,
  MetaAdsBusinessMetadataAccess,
  MetaAdsInsight,
} from './meta-ads.adapter';

const META_ADS_SOURCE_MODULE = 'meta_ads';
const DEFAULT_ENTITY_ID = 'tw-entity-001';
const AD_EXPENSE_ACCOUNT_CODE = '6118';

@Injectable()
export class MetaAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: MetaAdsAdapter,
    private readonly config: ConfigService,
  ) {}

  getConnectionInfo() {
    return this.adapter.getConnectionInfo();
  }

  async getReadiness() {
    const info = this.adapter.getConnectionInfo();
    const missing: string[] = [];
    if (!info.tokenConfigured) missing.push('META_ADS_ACCESS_TOKEN');
    if (!info.configuredAccounts.length) {
      missing.push('META_ADS_ACCOUNTS_JSON');
    }

    let accountProbe: {
      success: boolean;
      count: number;
      message?: string;
      businessMetadataAccess?: MetaAdsBusinessMetadataAccess;
    } | null = null;
    let insightProbe: {
      success: boolean;
      count: number;
      message?: string;
    } | null = null;
    let accessibleAccountRows: MetaAdsAdAccount[] = [];
    let insightRows: MetaAdsInsight[] = [];
    if (info.tokenConfigured) {
      try {
        const result = await this.adapter.fetchAdAccountsWithDiagnostics({
          limit: 25,
        });
        accessibleAccountRows = result.accounts;
        accountProbe = {
          success: true,
          count: result.accounts.length,
          businessMetadataAccess: result.businessMetadataAccess,
        };
      } catch (error: any) {
        accountProbe = {
          success: false,
          count: 0,
          message: error?.message || 'Meta ad account probe failed',
        };
      }
      try {
        const { since, until } = this.resolveRange(undefined, undefined);
        insightRows = await this.adapter.fetchInsights({
          since,
          until,
          level: 'campaign',
        });
        insightProbe = {
          success: true,
          count: insightRows.length,
        };
      } catch (error: unknown) {
        insightProbe = {
          success: false,
          count: 0,
          message:
            error instanceof Error
              ? error.message
              : 'Meta campaign insight probe failed',
        };
      }
    }

    const configuredAccountCount = info.configuredAccounts.length;
    const readableAccountCount = accountProbe?.success ? accountProbe.count : 0;
    const probeSucceeded = insightProbe?.success === true;
    const configuredAccountChecks = this.buildConfiguredAccountChecks(
      info.configuredAccounts,
      insightRows,
      probeSucceeded,
    );
    const allConfiguredAccountsChecked =
      probeSucceeded &&
      configuredAccountChecks.length === configuredAccountCount &&
      configuredAccountCount > 0 &&
      configuredAccountChecks.every(
        (account) => account.status !== 'unchecked',
      );
    const unexpectedAccountRefs = this.unexpectedInsightAccountRefs(
      info.configuredAccounts,
      insightRows,
    );
    const unconfiguredAccessibleAccounts =
      this.buildUnconfiguredAccessibleAccounts(
        info.configuredAccounts,
        accessibleAccountRows,
      );
    const brandMappingCoverage = this.buildReadinessBrandMappingCoverage(
      info.configuredAccounts,
      insightRows,
      probeSucceeded,
    );
    const transportReady = missing.length === 0 && allConfiguredAccountsChecked;
    const readyForAnalysis =
      transportReady &&
      unexpectedAccountRefs.length === 0 &&
      brandMappingCoverage.complete;
    const degradedDiagnostics = [
      accountProbe?.businessMetadataAccess?.status === 'degraded'
        ? accountProbe.businessMetadataAccess.diagnostic
        : null,
    ].filter((value): value is string => Boolean(value));

    return {
      ready: readyForAnalysis,
      transportReady,
      readyForAnalysis,
      releaseReady: readyForAnalysis,
      tokenConfigured: info.tokenConfigured,
      missing,
      apiVersion: info.apiVersion,
      configuredAccountCount,
      readableAccountCount,
      accountProbe,
      insightProbe,
      configuredAccountChecks,
      allConfiguredAccountsChecked,
      unexpectedAccountRefs,
      unconfiguredAccessibleAccounts,
      configuredAccounts: info.configuredAccounts,
      brandMappingCoverage,
      degraded: degradedDiagnostics.length > 0,
      degradedDiagnostics,
      nextAction: readyForAnalysis
        ? '可先用 /integrations/meta-ads/insights 預覽 spend，再用 /integrations/meta-ads/sync 寫入 Expense。'
        : transportReady
          ? '連線可用，但必須在 META_ADS_ACCOUNTS_JSON 為每個分析帳號設定明確的 reportBrand 或 brand；未完成前只會列入「待對應」。'
          : '請確認 Meta token 具備 ads_read，並提供 META_ADS_ACCOUNT_IDS 或 META_ADS_ACCOUNTS_JSON 帳戶 mapping。',
    };
  }

  async previewAdAccounts(params: { limit?: string | number } = {}) {
    const accounts = await this.adapter.fetchAdAccounts(params);
    return {
      success: true,
      count: accounts.length,
      accounts: accounts.map((account) => ({
        id: account.id || null,
        accountId: account.account_id || null,
        name: account.name || null,
        currency: account.currency || null,
        accountStatus: account.account_status ?? null,
        businessId: account.business?.id || null,
        businessName: account.business?.name || null,
      })),
    };
  }

  async previewInsights(params: {
    since?: Date;
    until?: Date;
    accountIds?: string[];
    level?: 'account' | 'campaign';
    limit?: string | number;
    maxPages?: string | number;
  }) {
    const { since, until } = this.resolveRange(params.since, params.until);
    const rows = await this.adapter.fetchInsights({
      since,
      until,
      accountIds: params.accountIds,
      level: params.level,
      limit: params.limit,
      maxPages: params.maxPages,
    });
    const spendSummary = summarizeAdsSpend(
      rows,
      (row) => row.currency,
      (row) => this.toNumber(row.spend),
      'Meta Ads preview',
    );
    const brandMappingCoverage = summarizeAdsBrandMappingCoverage(
      rows.map((row) => this.resolveRowBrandMapping(row)),
    );

    return {
      success: true,
      range: {
        since: since.toISOString(),
        until: until.toISOString(),
      },
      level: params.level || 'account',
      count: rows.length,
      ...spendSummary,
      brandMappingCoverage,
      releaseReady: brandMappingCoverage.complete,
      sample: rows
        .slice(0, Math.min(Number(params.limit || 20), 500))
        .map((row) => this.mapInsightPreview(row)),
    };
  }

  async syncInsights(params: {
    entityId?: string;
    since?: Date;
    until?: Date;
    accountIds?: string[];
    includeZeroSpend?: boolean;
    maxPages?: string | number;
  }) {
    const entityId =
      params.entityId ||
      this.config.get<string>('META_ADS_DEFAULT_ENTITY_ID', '') ||
      DEFAULT_ENTITY_ID;
    const { since, until } = this.resolveRange(params.since, params.until);
    const rows = await this.adapter.fetchInsights({
      since,
      until,
      accountIds: params.accountIds,
      level: 'campaign',
      maxPages: params.maxPages,
    });
    const syncableRows = rows.filter(
      (row) => params.includeZeroSpend || this.toNumber(row.spend) > 0,
    );
    let created = 0;
    let updated = 0;
    const brandMappingCoverage = summarizeAdsBrandMappingCoverage(
      syncableRows.map((row) => this.resolveRowBrandMapping(row)),
    );

    for (const row of syncableRows) {
      const result = await this.upsertExpense(entityId, row);
      if (result === 'created') created += 1;
      if (result === 'updated') updated += 1;
    }
    const legacySourceIds = [
      ...new Set(
        syncableRows.flatMap((row) => {
          const date = row.date_start || row.date_stop;
          const accountId = this.adapter.normalizeAccountId(
            row.rawAccount?.accountId || row.account_id || '',
          );
          return accountId && date ? [`${accountId}:${date}`] : [];
        }),
      ),
    ];
    const legacyCleanup = legacySourceIds.length
      ? await this.prisma.expense.deleteMany({
          where: {
            entityId,
            sourceModule: META_ADS_SOURCE_MODULE,
            sourceId: {
              in: legacySourceIds,
            },
          },
        })
      : { count: 0 };

    return {
      success: true,
      entityId,
      range: {
        since: since.toISOString(),
        until: until.toISOString(),
      },
      fetched: rows.length,
      synced: syncableRows.length,
      created,
      updated,
      deletedLegacyAggregates: legacyCleanup.count,
      skippedZeroSpend: rows.length - syncableRows.length,
      brandMappingCoverage,
      releaseReady: brandMappingCoverage.complete,
      expenseSourceModule: META_ADS_SOURCE_MODULE,
      dashboardEffect:
        'CEO Dashboard management summary already counts Expense rows whose description/account indicates Meta advertising spend.',
    };
  }

  assertSchedulerToken(syncToken?: string) {
    const expected = (
      this.config.get<string>('META_ADS_SYNC_JOB_TOKEN', '') || ''
    ).trim();
    if (!expected) {
      throw new BadRequestException(
        'META_ADS_SYNC_JOB_TOKEN is not configured',
      );
    }
    if (!syncToken || syncToken !== expected) {
      throw new BadRequestException('Invalid Meta Ads sync token');
    }
  }

  @Cron('17 4 * * *', { timeZone: 'Asia/Taipei' })
  async scheduledSync() {
    const enabled =
      (
        this.config.get<string>('META_ADS_SYNC_ENABLED', '') || ''
      ).toLowerCase() === 'true';
    if (!enabled) {
      return;
    }
    const until = new Date();
    const since = new Date(until);
    since.setUTCDate(since.getUTCDate() - 7);
    await this.syncInsights({ since, until });
  }

  private async upsertExpense(entityId: string, row: MetaAdsInsight) {
    const date = row.date_start || row.date_stop;
    if (!date) {
      return 'skipped';
    }
    const accountId = this.adapter.normalizeAccountId(
      row.rawAccount?.accountId || row.account_id || '',
    );
    if (!accountId) {
      return 'skipped';
    }

    const amount = new Decimal(this.toNumber(row.spend));
    const currency = requireCanonicalAdsCurrency(
      row.currency,
      `Meta Ads sync account ${accountId}`,
    );
    const campaignId = String(row.campaign_id || '').trim() || 'unattributed';
    const sourceId = `${accountId}:${campaignId}:${date}`;
    const description = this.buildExpenseDescription(row, accountId, date);
    const itemDescription = this.buildExpenseItemDescription(row, accountId);
    const existing = await this.prisma.expense.findFirst({
      where: {
        entityId,
        sourceModule: META_ADS_SOURCE_MODULE,
        sourceId,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.expense.update({
          where: { id: existing.id },
          data: {
            expenseDate: new Date(`${date}T00:00:00.000Z`),
            totalAmountOriginal: amount,
            totalAmountCurrency: currency,
            totalAmountFxRate: new Decimal(1),
            totalAmountBase: amount,
            description,
          },
        }),
        this.prisma.expenseItem.deleteMany({
          where: { expenseId: existing.id },
        }),
        this.prisma.expenseItem.create({
          data: {
            expenseId: existing.id,
            accountCode: AD_EXPENSE_ACCOUNT_CODE,
            amountOriginal: amount,
            amountCurrency: currency,
            amountFxRate: new Decimal(1),
            amountBase: amount,
            description: itemDescription,
          },
        }),
      ]);
      return 'updated';
    }

    await this.prisma.expense.create({
      data: {
        entityId,
        expenseDate: new Date(`${date}T00:00:00.000Z`),
        totalAmountOriginal: amount,
        totalAmountCurrency: currency,
        totalAmountFxRate: new Decimal(1),
        totalAmountBase: amount,
        description,
        sourceModule: META_ADS_SOURCE_MODULE,
        sourceId,
        items: {
          create: {
            accountCode: AD_EXPENSE_ACCOUNT_CODE,
            amountOriginal: amount,
            amountCurrency: currency,
            amountFxRate: new Decimal(1),
            amountBase: amount,
            description: itemDescription,
          },
        },
      },
    });
    return 'created';
  }

  private resolveRange(since?: Date, until?: Date) {
    const end = until && !Number.isNaN(until.getTime()) ? until : new Date();
    const start =
      since && !Number.isNaN(since.getTime())
        ? since
        : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (start > end) {
      throw new BadRequestException('since must be before until');
    }
    return { since: start, until: end };
  }

  private mapInsightPreview(row: MetaAdsInsight) {
    const currency = requireCanonicalAdsCurrency(
      row.currency,
      'Meta Ads preview row',
    );
    const accountId = this.adapter.normalizeAccountId(
      row.rawAccount?.accountId || row.account_id || '',
    );
    const brandMapping = this.resolveRowBrandMapping(row);
    return {
      accountId,
      accountName: row.account_name || row.rawAccount?.name || null,
      campaignId: row.campaign_id || null,
      campaignName: row.campaign_name || null,
      brand: row.rawAccount?.brand || null,
      reportBrand: row.rawAccount?.reportBrand || null,
      brandMode: row.rawAccount?.brandMode || 'single',
      allowedBrands: row.rawAccount?.allowedBrands || [],
      resolvedBrand: brandMapping.resolvedBrand,
      mappingStatus: brandMapping.mappingStatus,
      mappingSource: brandMapping.mappingSource,
      diagnostic: brandMapping.diagnostic,
      platform: row.rawAccount?.platform || null,
      market: row.rawAccount?.market || null,
      businessUnit: row.rawAccount?.businessUnit || null,
      channelCode: row.rawAccount?.channelCode || null,
      currency,
      currencySource: row.currencySource || null,
      dateStart: row.date_start || null,
      dateStop: row.date_stop || null,
      spend: this.toNumber(row.spend),
      impressions: this.toNumber(row.impressions),
      clicks: this.toNumber(row.clicks),
      ctr: this.toNumber(row.ctr),
      cpc: this.toNumber(row.cpc),
      cpm: this.toNumber(row.cpm),
      actions: this.mapActionBreakdown(row.actions),
      actionValues: this.mapActionBreakdown(row.action_values),
      purchaseRoas: this.mapActionBreakdown(row.purchase_roas),
    };
  }

  private mapActionBreakdown(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 100).flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }
      const record = item as Record<string, unknown>;
      const actionType = String(record.action_type ?? record.actionType ?? '')
        .normalize('NFKC')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 100);
      const numericValue = Number(record.value);
      if (!actionType || !Number.isFinite(numericValue) || numericValue < 0) {
        return [];
      }
      return [
        {
          action_type: actionType,
          value: numericValue,
        },
      ];
    });
  }

  private buildExpenseDescription(
    row: MetaAdsInsight,
    accountId: string,
    date: string,
  ) {
    const brandMapping = this.resolveRowBrandMapping(row);
    const parts = [
      'Meta Ads 廣告費',
      row.account_name || row.rawAccount?.name || accountId,
      row.rawAccount?.brand ? `brand=${row.rawAccount.brand}` : null,
      row.rawAccount?.reportBrand
        ? `reportBrand=${row.rawAccount.reportBrand}`
        : null,
      `resolvedBrand=${brandMapping.resolvedBrand}`,
      `mappingStatus=${brandMapping.mappingStatus}`,
      row.campaign_id ? `campaignId=${row.campaign_id}` : null,
      row.campaign_name ? `campaignName=${row.campaign_name}` : null,
      row.rawAccount?.platform ? `platform=${row.rawAccount.platform}` : null,
      row.rawAccount?.market ? `market=${row.rawAccount.market}` : null,
      row.rawAccount?.businessUnit
        ? `businessUnit=${row.rawAccount.businessUnit}`
        : null,
      row.rawAccount?.channelCode
        ? `channelCode=${row.rawAccount.channelCode}`
        : null,
      date,
    ].filter(Boolean);
    return parts.join(' ');
  }

  private buildExpenseItemDescription(row: MetaAdsInsight, accountId: string) {
    const brandMapping = this.resolveRowBrandMapping(row);
    const parts = [
      'Meta Ads spend',
      `account=${accountId}`,
      row.account_name ? `accountName=${row.account_name}` : null,
      row.rawAccount?.brand ? `brand=${row.rawAccount.brand}` : null,
      row.rawAccount?.reportBrand
        ? `reportBrand=${row.rawAccount.reportBrand}`
        : null,
      `resolvedBrand=${brandMapping.resolvedBrand}`,
      `mappingStatus=${brandMapping.mappingStatus}`,
      row.campaign_id ? `campaignId=${row.campaign_id}` : null,
      row.campaign_name ? `campaignName=${row.campaign_name}` : null,
      row.rawAccount?.platform ? `platform=${row.rawAccount.platform}` : null,
      row.rawAccount?.market ? `market=${row.rawAccount.market}` : null,
      row.rawAccount?.businessUnit
        ? `businessUnit=${row.rawAccount.businessUnit}`
        : null,
      row.rawAccount?.channelCode
        ? `channelCode=${row.rawAccount.channelCode}`
        : null,
      row.impressions ? `impressions=${row.impressions}` : null,
      row.clicks ? `clicks=${row.clicks}` : null,
    ].filter(Boolean);
    return parts.join('; ');
  }

  private resolveRowBrandMapping(
    row: MetaAdsInsight,
  ): AdsBrandMappingResolution {
    if (row.brandMapping) {
      return row.brandMapping;
    }
    const accountId = this.adapter.normalizeAccountId(
      row.rawAccount?.accountId || row.account_id || '',
    );
    return resolveConfiguredAdsBrandMapping(
      'meta',
      accountId,
      row.rawAccount,
      row.campaign_id,
    );
  }

  private buildConfiguredAccountChecks(
    configuredAccounts: MetaAdsAccountConfig[],
    rows: MetaAdsInsight[],
    probeSucceeded: boolean,
  ) {
    const rowCounts = new Map<string, number>();
    for (const row of rows) {
      const accountRef = this.adapter.normalizeAccountId(
        row.rawAccount?.accountId || row.account_id || '',
      );
      if (accountRef) {
        rowCounts.set(accountRef, (rowCounts.get(accountRef) || 0) + 1);
      }
    }
    return configuredAccounts.map((account) => {
      const accountRef = this.adapter.normalizeAccountId(account.accountId);
      const rowCount = rowCounts.get(accountRef) || 0;
      return {
        accountRef,
        accountName: account.name || null,
        status: probeSucceeded
          ? rowCount > 0
            ? ('rows_available' as const)
            : ('checked_no_spend' as const)
          : ('unchecked' as const),
        rowCount,
      };
    });
  }

  private unexpectedInsightAccountRefs(
    configuredAccounts: MetaAdsAccountConfig[],
    rows: MetaAdsInsight[],
  ) {
    const configuredRefs = new Set(
      configuredAccounts.map((account) =>
        this.adapter.normalizeAccountId(account.accountId),
      ),
    );
    return [
      ...new Set(
        rows
          .map((row) =>
            this.adapter.normalizeAccountId(
              row.rawAccount?.accountId || row.account_id || '',
            ),
          )
          .filter(
            (accountRef) => accountRef && !configuredRefs.has(accountRef),
          ),
      ),
    ].sort();
  }

  private buildUnconfiguredAccessibleAccounts(
    configuredAccounts: MetaAdsAccountConfig[],
    accessibleAccounts: MetaAdsAdAccount[],
  ) {
    const configuredRefs = new Set(
      configuredAccounts.map((account) =>
        this.adapter.normalizeAccountId(account.accountId),
      ),
    );
    const unconfiguredAccounts = new Map<
      string,
      {
        accountId: string;
        name: string | null;
        currency: string | null;
      }
    >();
    for (const account of accessibleAccounts) {
      const rawAccountId = account.id || account.account_id || '';
      const accountId = this.adapter.normalizeAccountId(rawAccountId);
      if (!accountId || configuredRefs.has(accountId)) {
        continue;
      }
      unconfiguredAccounts.set(accountId, {
        accountId,
        name: account.name || null,
        currency: account.currency || null,
      });
    }
    return [...unconfiguredAccounts.values()].sort((left, right) =>
      left.accountId.localeCompare(right.accountId),
    );
  }

  private buildReadinessBrandMappingCoverage(
    configuredAccounts: MetaAdsAccountConfig[],
    rows: MetaAdsInsight[],
    probeSucceeded: boolean,
  ) {
    const rowsByAccount = new Map<string, MetaAdsInsight[]>();
    for (const row of rows) {
      const accountRef = this.adapter.normalizeAccountId(
        row.rawAccount?.accountId || row.account_id || '',
      );
      const existing = rowsByAccount.get(accountRef) || [];
      existing.push(row);
      rowsByAccount.set(accountRef, existing);
    }
    const configuredRefs = new Set<string>();
    const dormantPortfolioAccountRefs: string[] = [];
    const resolutions = configuredAccounts.flatMap((account) => {
      const accountRef = this.adapter.normalizeAccountId(account.accountId);
      configuredRefs.add(accountRef);
      const accountRows = rowsByAccount.get(accountRef) || [];
      if (probeSucceeded && accountRows.length > 0) {
        return accountRows.map((row) => this.resolveRowBrandMapping(row));
      }
      if (
        probeSucceeded &&
        accountRows.length === 0 &&
        account.brandMode === 'portfolio' &&
        account.allowedBrands?.length &&
        !account.campaignBrandMappings?.length
      ) {
        dormantPortfolioAccountRefs.push(accountRef);
        return [];
      }
      if (
        account.brandMode === 'portfolio' &&
        account.campaignBrandMappings?.length
      ) {
        return account.campaignBrandMappings.map((campaign) =>
          resolveConfiguredAdsBrandMapping(
            'meta',
            accountRef,
            account,
            campaign.campaignId,
          ),
        );
      }
      return [resolveConfiguredAdsBrandMapping('meta', accountRef, account)];
    });
    if (probeSucceeded) {
      resolutions.push(
        ...rows
          .filter((row) => {
            const accountRef = this.adapter.normalizeAccountId(
              row.rawAccount?.accountId || row.account_id || '',
            );
            return !configuredRefs.has(accountRef);
          })
          .map((row) => this.resolveRowBrandMapping(row)),
      );
    }
    const coverage = summarizeAdsBrandMappingCoverage(resolutions);
    return {
      ...coverage,
      complete:
        coverage.unmappedAccounts === 0 &&
        (coverage.totalAccounts > 0 || dormantPortfolioAccountRefs.length > 0),
      dormantPortfolioAccountRefs: dormantPortfolioAccountRefs.sort(),
    };
  }

  private toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
