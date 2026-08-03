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
  GoogleAdsAccountConfig,
  GoogleAdsAdapter,
  GoogleAdsInsight,
} from './google-ads.adapter';

const GOOGLE_ADS_SOURCE_MODULE = 'google_ads';
const DEFAULT_ENTITY_ID = 'tw-entity-001';
const AD_EXPENSE_ACCOUNT_CODE = '6118';

@Injectable()
export class GoogleAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: GoogleAdsAdapter,
    private readonly config: ConfigService,
  ) {}

  getConnectionInfo() {
    return this.adapter.getConnectionInfo();
  }

  async getReadiness() {
    const info = this.adapter.getConnectionInfo();
    const missing: string[] = [];
    if (!info.developerTokenConfigured) {
      missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
    }
    if (!info.oauthConfigured) {
      const missingCredentials = info.missingRefreshTokenEnvs.length
        ? ` (${info.missingRefreshTokenEnvs.join(', ')})`
        : '';
      missing.push(
        `GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET / Google Ads refresh token${missingCredentials}`,
      );
    }
    if (!info.configuredAccounts.length) {
      missing.push('GOOGLE_ADS_CUSTOMER_ID or GOOGLE_ADS_ACCOUNTS_JSON');
    }

    let insightProbe: {
      success: boolean;
      count: number;
      spendTotalsByCurrency: Record<string, number>;
      spendTotal: number | null;
      spendTotalCurrency: string | null;
      message?: string;
    } | null = null;
    let accessibleCustomers: string[] = [];
    const accessibleCustomerCredentialSources = new Map<string, Set<string>>();
    let accessibleCustomersError: string | null = null;
    let insightRows: GoogleAdsInsight[] = [];
    if (!missing.length) {
      const errors: string[] = [];
      const refreshTokenEnvs = [
        ...new Set(
          info.configuredAccounts.map(
            (account) => account.refreshTokenEnv || 'GOOGLE_ADS_REFRESH_TOKEN',
          ),
        ),
      ];
      for (const refreshTokenEnv of refreshTokenEnvs) {
        try {
          const customers =
            await this.adapter.listAccessibleCustomers(refreshTokenEnv);
          accessibleCustomers.push(...customers);
          for (const customerId of customers) {
            const normalizedCustomerId = this.normalizeCustomerId(customerId);
            if (!normalizedCustomerId) {
              continue;
            }
            const sources =
              accessibleCustomerCredentialSources.get(normalizedCustomerId) ||
              new Set<string>();
            sources.add(refreshTokenEnv);
            accessibleCustomerCredentialSources.set(
              normalizedCustomerId,
              sources,
            );
          }
        } catch (error: unknown) {
          errors.push(
            `${refreshTokenEnv}: ${
              error instanceof Error
                ? error.message
                : 'Google Ads accessible customers probe failed'
            }`,
          );
        }
      }
      accessibleCustomers = [...new Set(accessibleCustomers)];
      accessibleCustomersError = errors.length ? errors.join('; ') : null;
      try {
        const { since, until } = this.resolveRange(undefined, undefined);
        const rows = await this.adapter.fetchInsights({
          since,
          until,
          level: 'campaign',
        });
        insightRows = rows;
        const spendSummary = summarizeAdsSpend(
          rows,
          (row) => row.currency,
          (row) => this.costMicrosToAmount(row.costMicros),
          'Google Ads readiness probe',
        );
        insightProbe = {
          success: true,
          count: rows.length,
          ...spendSummary,
        };
      } catch (error: unknown) {
        insightProbe = {
          success: false,
          count: 0,
          spendTotalsByCurrency: {},
          spendTotal: null,
          spendTotalCurrency: null,
          message:
            error instanceof Error
              ? error.message
              : 'Google Ads insight probe failed',
        };
      }
    }

    const probeSucceeded = insightProbe?.success === true;
    const configuredAccountChecks = this.buildConfiguredAccountChecks(
      info.configuredAccounts,
      insightRows,
      probeSucceeded,
    );
    const allConfiguredAccountsChecked =
      probeSucceeded &&
      configuredAccountChecks.length === info.configuredAccounts.length &&
      info.configuredAccounts.length > 0 &&
      configuredAccountChecks.every(
        (account) => account.status !== 'unchecked',
      );
    const unverifiedConfiguredAccounts = configuredAccountChecks
      .filter((account) => account.status === 'unchecked')
      .map((account) => account.accountRef);
    const unconfiguredAccessibleAccounts =
      this.buildUnconfiguredAccessibleAccounts(
        info.configuredAccounts,
        accessibleCustomerCredentialSources,
        info.loginCustomerId,
      );
    const unexpectedAccountRefs = this.unexpectedInsightAccountRefs(
      info.configuredAccounts,
      insightRows,
    );
    const liveBrandMappingCoverage = this.buildReadinessBrandMappingCoverage(
      info.configuredAccounts,
      insightRows,
      probeSucceeded,
    );
    const transportReady = missing.length === 0 && allConfiguredAccountsChecked;
    const readyForAnalysis =
      transportReady &&
      unexpectedAccountRefs.length === 0 &&
      liveBrandMappingCoverage.complete;

    return {
      ready: readyForAnalysis,
      transportReady,
      readyForAnalysis,
      releaseReady: readyForAnalysis,
      missing,
      apiVersion: info.apiVersion,
      configuredAccountCount: info.configuredAccounts.length,
      configuredAccounts: info.configuredAccounts,
      loginCustomerId: info.loginCustomerId || null,
      accessibleCustomers,
      inaccessibleConfiguredAccounts: [],
      unverifiedConfiguredAccounts,
      unconfiguredAccessibleAccounts,
      configuredAccountChecks,
      allConfiguredAccountsChecked,
      unexpectedAccountRefs,
      accessibleCustomersError,
      insightProbe,
      brandMappingCoverage: liveBrandMappingCoverage,
      accessNote:
        insightProbe?.success === true
          ? 'Google Ads 子帳戶已透過 manager account 查詢成功；listAccessibleCustomers 只會列出 OAuth 直接可見的客戶或管理帳戶。'
          : null,
      nextAction: readyForAnalysis
        ? '可先用 /integrations/google-ads/insights 預覽 spend，再用 /integrations/google-ads/sync 寫入 Expense。'
        : transportReady
          ? '連線可用，但必須在 GOOGLE_ADS_ACCOUNTS_JSON 為每個分析帳號設定明確的 reportBrand 或 brand；未完成前只會列入「待對應」。'
          : '請到 Google Ads API 中心取得 developer token，並提供 OAuth client / refresh token / customer ID。',
    };
  }

  async previewInsights(params: {
    since?: Date;
    until?: Date;
    customerIds?: string[];
    level?: 'account' | 'campaign';
    pageSize?: string | number;
    maxPages?: string | number;
  }) {
    const { since, until } = this.resolveRange(params.since, params.until);
    const rows = await this.adapter.fetchInsights({
      since,
      until,
      customerIds: params.customerIds,
      level: params.level,
      pageSize: params.pageSize,
      maxPages: params.maxPages,
    });
    const spendSummary = summarizeAdsSpend(
      rows,
      (row) => row.currency,
      (row) => this.costMicrosToAmount(row.costMicros),
      'Google Ads preview',
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
        .slice(0, Math.min(Number(params.pageSize || 20), 500))
        .map((row) => this.mapInsightPreview(row)),
    };
  }

  async syncInsights(params: {
    entityId?: string;
    since?: Date;
    until?: Date;
    customerIds?: string[];
    includeZeroSpend?: boolean;
    maxPages?: string | number;
  }) {
    const entityId =
      params.entityId ||
      this.config.get<string>('GOOGLE_ADS_DEFAULT_ENTITY_ID', '') ||
      DEFAULT_ENTITY_ID;
    const { since, until } = this.resolveRange(params.since, params.until);
    const rows = await this.adapter.fetchInsights({
      since,
      until,
      customerIds: params.customerIds,
      level: 'campaign',
      maxPages: params.maxPages,
    });
    const syncableRows = rows.filter(
      (row) =>
        params.includeZeroSpend || this.costMicrosToAmount(row.costMicros) > 0,
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
        syncableRows.flatMap((row) =>
          row.customerId && row.date ? [`${row.customerId}:${row.date}`] : [],
        ),
      ),
    ];
    const legacyCleanup = legacySourceIds.length
      ? await this.prisma.expense.deleteMany({
          where: {
            entityId,
            sourceModule: GOOGLE_ADS_SOURCE_MODULE,
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
      expenseSourceModule: GOOGLE_ADS_SOURCE_MODULE,
      dashboardEffect:
        'CEO Dashboard management summary counts Google Ads Expense rows as advertising spend.',
    };
  }

  assertSchedulerToken(syncToken?: string) {
    const expected = (
      this.config.get<string>('GOOGLE_ADS_SYNC_JOB_TOKEN', '') || ''
    ).trim();
    if (!expected) {
      throw new BadRequestException(
        'GOOGLE_ADS_SYNC_JOB_TOKEN is not configured',
      );
    }
    if (!syncToken || syncToken !== expected) {
      throw new BadRequestException('Invalid Google Ads sync token');
    }
  }

  @Cron('27 4 * * *', { timeZone: 'Asia/Taipei' })
  async scheduledSync() {
    const enabled =
      (
        this.config.get<string>('GOOGLE_ADS_SYNC_ENABLED', '') || ''
      ).toLowerCase() === 'true';
    if (!enabled) {
      return;
    }
    const until = new Date();
    const since = new Date(until);
    since.setUTCDate(since.getUTCDate() - 7);
    await this.syncInsights({ since, until });
  }

  private async upsertExpense(entityId: string, row: GoogleAdsInsight) {
    if (!row.date || !row.customerId) {
      return 'skipped';
    }

    const amount = new Decimal(this.costMicrosToAmount(row.costMicros));
    const currency = requireCanonicalAdsCurrency(
      row.currency,
      `Google Ads sync account ${row.customerId}`,
    );
    const campaignId = String(row.campaignId || '').trim() || 'unattributed';
    const sourceId = `${row.customerId}:${campaignId}:${row.date}`;
    const description = this.buildExpenseDescription(row);
    const itemDescription = this.buildExpenseItemDescription(row);
    const existing = await this.prisma.expense.findFirst({
      where: {
        entityId,
        sourceModule: GOOGLE_ADS_SOURCE_MODULE,
        sourceId,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.expense.update({
          where: { id: existing.id },
          data: {
            expenseDate: new Date(`${row.date}T00:00:00.000Z`),
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
        expenseDate: new Date(`${row.date}T00:00:00.000Z`),
        totalAmountOriginal: amount,
        totalAmountCurrency: currency,
        totalAmountFxRate: new Decimal(1),
        totalAmountBase: amount,
        description,
        sourceModule: GOOGLE_ADS_SOURCE_MODULE,
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

  private mapInsightPreview(row: GoogleAdsInsight) {
    const currency = requireCanonicalAdsCurrency(
      row.currency,
      'Google Ads preview row',
    );
    const brandMapping = this.resolveRowBrandMapping(row);
    return {
      customerId: row.customerId,
      customerName: row.customerName || row.rawAccount?.name || null,
      campaignId: row.campaignId || null,
      campaignName: row.campaignName || null,
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
      date: row.date,
      spend: this.costMicrosToAmount(row.costMicros),
      impressions: this.toNumber(row.impressions),
      clicks: this.toNumber(row.clicks),
      conversions: this.toNumber(row.conversions),
      conversionsValue: this.toNumber(row.conversionsValue),
    };
  }

  private buildExpenseDescription(row: GoogleAdsInsight) {
    const brandMapping = this.resolveRowBrandMapping(row);
    const parts = [
      'Google Ads 廣告費',
      row.customerName || row.rawAccount?.name || row.customerId,
      row.rawAccount?.brand ? `brand=${row.rawAccount.brand}` : null,
      row.rawAccount?.reportBrand
        ? `reportBrand=${row.rawAccount.reportBrand}`
        : null,
      `resolvedBrand=${brandMapping.resolvedBrand}`,
      `mappingStatus=${brandMapping.mappingStatus}`,
      row.campaignId ? `campaignId=${row.campaignId}` : null,
      row.campaignName ? `campaignName=${row.campaignName}` : null,
      row.rawAccount?.platform ? `platform=${row.rawAccount.platform}` : null,
      row.rawAccount?.market ? `market=${row.rawAccount.market}` : null,
      row.rawAccount?.businessUnit
        ? `businessUnit=${row.rawAccount.businessUnit}`
        : null,
      row.rawAccount?.channelCode
        ? `channelCode=${row.rawAccount.channelCode}`
        : null,
      row.date,
    ].filter(Boolean);
    return parts.join(' ');
  }

  private buildExpenseItemDescription(row: GoogleAdsInsight) {
    const brandMapping = this.resolveRowBrandMapping(row);
    const parts = [
      'Google Ads spend',
      `customer=${row.customerId}`,
      row.customerName ? `customerName=${row.customerName}` : null,
      row.rawAccount?.brand ? `brand=${row.rawAccount.brand}` : null,
      row.rawAccount?.reportBrand
        ? `reportBrand=${row.rawAccount.reportBrand}`
        : null,
      `resolvedBrand=${brandMapping.resolvedBrand}`,
      `mappingStatus=${brandMapping.mappingStatus}`,
      row.campaignId ? `campaignId=${row.campaignId}` : null,
      row.campaignName ? `campaignName=${row.campaignName}` : null,
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
    row: GoogleAdsInsight,
  ): AdsBrandMappingResolution {
    if (row.brandMapping) {
      return row.brandMapping;
    }
    return resolveConfiguredAdsBrandMapping(
      'google',
      row.customerId,
      row.rawAccount,
      row.campaignId,
    );
  }

  private buildConfiguredAccountChecks(
    configuredAccounts: GoogleAdsAccountConfig[],
    rows: GoogleAdsInsight[],
    probeSucceeded: boolean,
  ) {
    const rowCounts = new Map<string, number>();
    for (const row of rows) {
      const accountRef = this.normalizeCustomerId(
        row.rawAccount?.customerId || row.customerId,
      );
      if (accountRef) {
        rowCounts.set(accountRef, (rowCounts.get(accountRef) || 0) + 1);
      }
    }
    return configuredAccounts.map((account) => {
      const accountRef = this.normalizeCustomerId(account.customerId);
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
    configuredAccounts: GoogleAdsAccountConfig[],
    rows: GoogleAdsInsight[],
  ) {
    const configuredRefs = new Set(
      configuredAccounts.map((account) =>
        this.normalizeCustomerId(account.customerId),
      ),
    );
    return [
      ...new Set(
        rows
          .map((row) =>
            this.normalizeCustomerId(
              row.rawAccount?.customerId || row.customerId,
            ),
          )
          .filter(
            (accountRef) => accountRef && !configuredRefs.has(accountRef),
          ),
      ),
    ].sort();
  }

  private buildUnconfiguredAccessibleAccounts(
    configuredAccounts: GoogleAdsAccountConfig[],
    accessibleCustomerCredentialSources: Map<string, Set<string>>,
    defaultLoginCustomerId?: string | null,
  ) {
    const configuredRefs = new Set(
      [
        defaultLoginCustomerId,
        ...configuredAccounts.flatMap((account) => [
          account.customerId,
          account.loginCustomerId,
          account.managerCustomerId,
        ]),
      ]
        .map((customerId) => this.normalizeCustomerId(customerId || ''))
        .filter(Boolean),
    );
    return [...accessibleCustomerCredentialSources.entries()]
      .filter(([customerId]) => !configuredRefs.has(customerId))
      .map(([customerId, credentialSources]) => ({
        customerId,
        name: null,
        currency: null,
        credentialSources: [...credentialSources].sort(),
      }))
      .sort((left, right) => left.customerId.localeCompare(right.customerId));
  }

  private buildReadinessBrandMappingCoverage(
    configuredAccounts: GoogleAdsAccountConfig[],
    rows: GoogleAdsInsight[],
    probeSucceeded: boolean,
  ) {
    const rowsByAccount = new Map<string, GoogleAdsInsight[]>();
    for (const row of rows) {
      const accountRef = this.normalizeCustomerId(
        row.rawAccount?.customerId || row.customerId,
      );
      const existing = rowsByAccount.get(accountRef) || [];
      existing.push(row);
      rowsByAccount.set(accountRef, existing);
    }
    const configuredRefs = new Set<string>();
    const dormantPortfolioAccountRefs: string[] = [];
    const resolutions = configuredAccounts.flatMap((account) => {
      const accountRef = this.normalizeCustomerId(account.customerId);
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
            'google',
            accountRef,
            account,
            campaign.campaignId,
          ),
        );
      }
      return [resolveConfiguredAdsBrandMapping('google', accountRef, account)];
    });
    if (probeSucceeded) {
      resolutions.push(
        ...rows
          .filter((row) => {
            const accountRef = this.normalizeCustomerId(
              row.rawAccount?.customerId || row.customerId,
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

  private normalizeCustomerId(value: unknown) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  private costMicrosToAmount(value: unknown) {
    return Number((this.toNumber(value) / 1_000_000).toFixed(2));
  }

  private toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
