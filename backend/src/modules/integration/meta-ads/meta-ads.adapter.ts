import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdsCurrencySource,
  normalizeConfiguredAdsCurrency,
  resolveAdsCurrency,
} from '../ads-currency';
import {
  AdsBrandMappingResolution,
  resolveConfiguredAdsBrandMapping,
  summarizeAdsBrandMappingCoverage,
} from '../ads-brand-mapping';

export type MetaAdsAccountConfig = {
  accountId: string;
  name?: string;
  brand?: string;
  reportBrand?: string;
  brandMode?: 'single' | 'portfolio';
  allowedBrands?: string[];
  campaignBrandMappings?: Array<{
    campaignId: string;
    brand: string;
  }>;
  platform?: string;
  market?: string;
  businessUnit?: string;
  channelCode?: string;
  currency?: string;
  currencySource?: AdsCurrencySource;
  entityId?: string;
};

export type MetaAdsAdAccount = {
  id?: string;
  account_id?: string;
  name?: string;
  currency?: string;
  account_status?: number;
  business?: {
    id?: string;
    name?: string;
  };
};

export type MetaAdsInsight = {
  currency: string;
  currencySource: AdsCurrencySource;
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  account_currency?: string;
  date_start?: string;
  date_stop?: string;
  purchase_roas?: unknown;
  actions?: unknown;
  action_values?: unknown;
  rawAccount?: MetaAdsAccountConfig | null;
  brandMapping?: AdsBrandMappingResolution;
};

type MetaAdsInsightApiRow = Omit<
  MetaAdsInsight,
  'currency' | 'currencySource' | 'rawAccount' | 'brandMapping'
>;

type MetaListResponse<T> = {
  data?: T[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

export class MetaAdsApiRequestException extends BadGatewayException {
  readonly metaCode: number | null;
  readonly metaType: string | null;
  readonly metaSubcode: number | null;
  readonly metaMessage: string;

  constructor(error: MetaListResponse<unknown>['error'], statusText: string) {
    const metaMessage = String(error?.message || statusText || 'Unknown error');
    super(`Meta Ads API request failed: ${metaMessage}`);
    const code = Number(error?.code);
    const subcode = Number(error?.error_subcode);
    this.metaCode = Number.isSafeInteger(code) ? code : null;
    this.metaType =
      typeof error?.type === 'string' && error.type.trim()
        ? error.type.trim()
        : null;
    this.metaSubcode = Number.isSafeInteger(subcode) ? subcode : null;
    this.metaMessage = metaMessage;
  }
}

export type MetaAdsBusinessMetadataAccess = {
  status: 'ready' | 'degraded';
  fallbackUsed: boolean;
  diagnostic: string | null;
};

@Injectable()
export class MetaAdsAdapter {
  private readonly graphBaseUrl: string;
  private readonly apiVersion: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.graphBaseUrl =
      this.config.get<string>('META_ADS_GRAPH_BASE_URL', '') ||
      'https://graph.facebook.com';
    this.apiVersion =
      this.config.get<string>('META_ADS_API_VERSION', '') || 'v23.0';
    this.timeoutMs = Math.min(
      Math.max(
        Number(this.config.get<string>('META_ADS_TIMEOUT_MS', '30000')),
        5000,
      ),
      120000,
    );
  }

  getConnectionInfo() {
    const configuredAccounts = this.getConfiguredAccounts();
    const campaignBrandRegistry = this.getCampaignBrandRegistry();
    const brandMappingCoverage = summarizeAdsBrandMappingCoverage(
      configuredAccounts.flatMap((account) =>
        account.brandMode === 'portfolio' &&
        account.campaignBrandMappings?.length
          ? account.campaignBrandMappings.map((campaign) =>
              resolveConfiguredAdsBrandMapping(
                'meta',
                this.normalizeAccountId(account.accountId),
                account,
                campaign.campaignId,
              ),
            )
          : [
              resolveConfiguredAdsBrandMapping(
                'meta',
                this.normalizeAccountId(account.accountId),
                account,
              ),
            ],
      ),
    );
    return {
      apiBaseUrl: this.graphBaseUrl,
      apiVersion: this.apiVersion,
      tokenConfigured: Boolean(this.getToken()),
      configuredAccounts: configuredAccounts.map((account) => ({
        accountId: this.normalizeAccountId(account.accountId),
        name: account.name || null,
        brand: account.brand || null,
        reportBrand: account.reportBrand || null,
        brandMode: account.brandMode || 'single',
        allowedBrands: account.allowedBrands || [],
        campaignBrandMappings: account.campaignBrandMappings || [],
        platform: account.platform || null,
        market: account.market || null,
        businessUnit: account.businessUnit || null,
        channelCode: account.channelCode || null,
        currency: account.currency || null,
        entityId: account.entityId || null,
      })),
      brandMappingCoverage,
      campaignBrandRegistryConfigured: campaignBrandRegistry.length > 0,
      campaignBrandRegistryCount: campaignBrandRegistry.length,
      requiredPermission: 'ads_read',
      recommendedCredential: 'Meta Business Manager System User access token',
      supports: ['adaccounts', 'insights.spend', 'daily expense sync'],
    };
  }

  getConfiguredAccounts(): MetaAdsAccountConfig[] {
    const json = (
      this.config.get<string>('META_ADS_ACCOUNTS_JSON', '') || ''
    ).trim();
    if (json) {
      try {
        const parsed = JSON.parse(json);
        const items = Array.isArray(parsed) ? parsed : parsed.accounts;
        if (Array.isArray(items)) {
          return this.applyCampaignBrandRegistry(
            items
              .map((item) => this.normalizeAccountConfig(item))
              .filter((item): item is MetaAdsAccountConfig => Boolean(item)),
          );
        }
      } catch (error: unknown) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          'META_ADS_ACCOUNTS_JSON is not valid JSON',
        );
      }
    }

    return this.applyCampaignBrandRegistry(
      (this.config.get<string>('META_ADS_ACCOUNT_IDS', '') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((accountId) => ({
          accountId: this.normalizeAccountId(accountId),
        })),
    );
  }

  async fetchAdAccounts(params: { limit?: string | number } = {}) {
    const result = await this.fetchAdAccountsWithDiagnostics(params);
    return result.accounts;
  }

  async fetchAdAccountsWithDiagnostics(
    params: { limit?: string | number } = {},
  ): Promise<{
    accounts: MetaAdsAdAccount[];
    businessMetadataAccess: MetaAdsBusinessMetadataAccess;
  }> {
    this.assertTokenConfigured();

    const limit = Math.min(Math.max(Number(params.limit || 100), 1), 500);
    let response: MetaListResponse<MetaAdsAdAccount>;
    let businessMetadataAccess: MetaAdsBusinessMetadataAccess = {
      status: 'ready',
      fallbackUsed: false,
      diagnostic: null,
    };
    try {
      response = await this.request<MetaListResponse<MetaAdsAdAccount>>(
        '/me/adaccounts',
        {
          fields:
            'id,account_id,name,currency,account_status,business{id,name}',
          limit: String(limit),
        },
      );
    } catch (error: unknown) {
      if (!this.isBusinessMetadataPermissionError(error)) {
        throw error;
      }
      response = await this.request<MetaListResponse<MetaAdsAdAccount>>(
        '/me/adaccounts',
        {
          fields: 'id,account_id,name,currency,account_status',
          limit: String(limit),
        },
      );
      businessMetadataAccess = {
        status: 'degraded',
        fallbackUsed: true,
        diagnostic:
          'Meta ads_read 可用，但 business_management 無法讀取 business metadata；帳號清單已使用不含 business 欄位的最小唯讀查詢。',
      };
    }

    return {
      accounts: Array.isArray(response.data) ? response.data : [],
      businessMetadataAccess,
    };
  }

  async fetchInsights(params: {
    since: Date;
    until: Date;
    accountIds?: string[];
    level?: 'account' | 'campaign';
    limit?: string | number;
    maxPages?: string | number;
  }) {
    this.assertTokenConfigured();

    const accounts = await this.resolveAccounts(params.accountIds);
    const limit = Math.min(Math.max(Number(params.limit || 250), 1), 500);
    const maxPages = Math.min(Math.max(Number(params.maxPages || 20), 1), 100);
    const level = params.level || 'account';
    const fields = [
      'account_id',
      'account_name',
      level === 'campaign' ? 'campaign_id' : null,
      level === 'campaign' ? 'campaign_name' : null,
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'account_currency',
      'purchase_roas',
      'actions',
      'action_values',
      'date_start',
      'date_stop',
    ]
      .filter(Boolean)
      .join(',');
    const range = {
      since: this.formatDate(params.since),
      until: this.formatDate(params.until),
    };
    const rows: MetaAdsInsight[] = [];

    for (const account of accounts) {
      let after = '';
      let page = 0;
      do {
        const response = await this.request<
          MetaListResponse<MetaAdsInsightApiRow>
        >(`/${this.normalizeAccountId(account.accountId)}/insights`, {
          fields,
          level,
          time_increment: '1',
          time_range: JSON.stringify(range),
          limit: String(limit),
          ...(after ? { after } : {}),
        });
        const pageRows = Array.isArray(response.data) ? response.data : [];
        rows.push(
          ...pageRows.map((row) => {
            const accountRef = this.normalizeAccountId(
              row.account_id || account.accountId,
            );
            const currency = resolveAdsCurrency({
              provider: 'Meta',
              accountRef,
              platformCurrency: row.account_currency,
              configuredCurrency: account.currency,
              configuredCurrencySource: account.currencySource,
            });
            const rawAccount = {
              ...account,
              accountId: accountRef,
              currency: currency.currency,
              currencySource: currency.currencySource,
            };
            return {
              ...row,
              account_currency: currency.currency,
              currency: currency.currency,
              currencySource: currency.currencySource,
              rawAccount,
              brandMapping: resolveConfiguredAdsBrandMapping(
                'meta',
                accountRef,
                rawAccount,
                row.campaign_id,
              ),
            };
          }),
        );
        page += 1;
        after = response.paging?.cursors?.after || '';
      } while (after && page < maxPages);
    }

    return rows;
  }

  normalizeAccountId(value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return trimmed;
    }
    return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`;
  }

  private async resolveAccounts(
    accountIds?: string[],
  ): Promise<MetaAdsAccountConfig[]> {
    const configured = this.getConfiguredAccounts();
    const configuredById = new Map(
      configured.map((account) => [
        this.normalizeAccountId(account.accountId),
        account,
      ]),
    );
    const requested = (accountIds || [])
      .map((value) => value.trim())
      .filter(Boolean)
      .map((accountId) => {
        const normalized = this.normalizeAccountId(accountId);
        return {
          ...(configuredById.get(normalized) || {}),
          accountId: normalized,
        };
      });
    if (requested.length) {
      return requested;
    }
    if (configured.length) {
      return configured.map((item) => ({
        ...item,
        accountId: this.normalizeAccountId(item.accountId),
      }));
    }

    const apiAccounts = await this.fetchAdAccounts();
    const accounts = apiAccounts.flatMap((account) => {
      const accountId = account.id || account.account_id || '';
      if (!accountId) return [];
      return [
        {
          accountId: this.normalizeAccountId(accountId),
          name: this.optionalString(account.name),
          currency: this.optionalString(account.currency),
          currencySource: account.currency ? ('platform' as const) : undefined,
        },
      ];
    });

    if (!accounts.length) {
      throw new BadRequestException(
        'Meta token is valid, but no readable ad accounts were returned. Configure META_ADS_ACCOUNT_IDS or grant ads_read to the ad account.',
      );
    }

    return accounts;
  }

  private async request<T>(path: string, params: Record<string, string>) {
    const token = this.assertTokenConfigured();
    const url = new URL(
      `${this.graphBaseUrl.replace(/\/$/, '')}/${this.apiVersion}${path}`,
    );
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('access_token', token);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      const body = (await response.json().catch(() => ({}))) as
        | T
        | MetaListResponse<unknown>;
      if (!response.ok || (body as MetaListResponse<unknown>).error) {
        const error = (body as MetaListResponse<unknown>).error;
        throw new MetaAdsApiRequestException(error, response.statusText);
      }
      return body as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new BadGatewayException('Meta Ads API request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getToken() {
    return (this.config.get<string>('META_ADS_ACCESS_TOKEN', '') || '').trim();
  }

  private assertTokenConfigured() {
    const token = this.getToken();
    if (!token) {
      throw new UnauthorizedException(
        'META_ADS_ACCESS_TOKEN is not configured',
      );
    }
    return token;
  }

  private isBusinessMetadataPermissionError(error: unknown) {
    if (!(error instanceof MetaAdsApiRequestException)) {
      return false;
    }
    const explicitlyBusinessRelated =
      /\bbusiness_management\b/i.test(error.metaMessage) ||
      /\bbusiness(?:\{id,name\}| field| metadata)\b/i.test(error.metaMessage);
    return (
      error.metaCode === 100 &&
      error.metaType?.toLowerCase() === 'oauthexception' &&
      explicitlyBusinessRelated
    );
  }

  private normalizeAccountConfig(input: unknown): MetaAdsAccountConfig | null {
    if (!input || typeof input !== 'object') {
      return null;
    }
    const item = input as Record<string, unknown>;
    const accountId = String(
      item.accountId || item.account_id || item.id || '',
    ).trim();
    if (!accountId) {
      return null;
    }
    return {
      accountId: this.normalizeAccountId(accountId),
      name: this.optionalString(item.name),
      brand: this.optionalString(item.brand),
      reportBrand: this.optionalString(
        item.reportBrand || item.report_brand || item.reportingBrand,
      ),
      brandMode: this.normalizeBrandMode(item.brandMode || item.brand_mode),
      allowedBrands: this.normalizeStringList(
        item.allowedBrands || item.allowed_brands,
      ),
      campaignBrandMappings: this.normalizeCampaignBrandMappings(
        item.campaignBrandMappings ||
          item.campaign_brand_mappings ||
          item.campaigns,
      ),
      platform: this.optionalString(item.platform),
      market: this.optionalString(item.market || item.country),
      businessUnit: this.optionalString(
        item.businessUnit || item.business_unit,
      ),
      channelCode: this.optionalString(item.channelCode || item.channel_code),
      currency: normalizeConfiguredAdsCurrency(
        item.currency,
        'META_ADS_ACCOUNTS_JSON currency',
      ),
      currencySource: item.currency ? 'account_config' : undefined,
      entityId: this.optionalString(item.entityId || item.entity_id),
    };
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private normalizeBrandMode(value: unknown): 'single' | 'portfolio' {
    const normalized = this.optionalString(value)?.toLowerCase() || 'single';
    if (
      normalized === 'single' ||
      normalized === 'single_brand' ||
      normalized === 'single-brand'
    ) {
      return 'single';
    }
    if (normalized === 'portfolio') {
      return 'portfolio';
    }
    throw new BadRequestException(
      'META_ADS_ACCOUNTS_JSON brandMode must be single (single_brand alias accepted) or portfolio',
    );
  }

  private normalizeStringList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const values = [
      ...new Set(
        value
          .map((item) => this.optionalString(item))
          .filter((item): item is string => Boolean(item)),
      ),
    ];
    return values.length ? values : undefined;
  }

  private normalizeCampaignBrandMappings(
    value: unknown,
  ): Array<{ campaignId: string; brand: string }> | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const mappings = value.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }
      const record = item as Record<string, unknown>;
      const campaignId = this.optionalString(
        record.campaignId || record.campaign_id || record.id,
      );
      const brand = this.optionalString(
        record.reportBrand || record.report_brand || record.brand,
      );
      return campaignId && brand ? [{ campaignId, brand }] : [];
    });
    const uniqueMappings = new Map<string, string>();
    for (const mapping of mappings) {
      const existing = uniqueMappings.get(mapping.campaignId);
      if (existing && existing !== mapping.brand) {
        throw new BadRequestException(
          `META_ADS_ACCOUNTS_JSON has conflicting brands for campaign ${mapping.campaignId}`,
        );
      }
      uniqueMappings.set(mapping.campaignId, mapping.brand);
    }
    return uniqueMappings.size
      ? [...uniqueMappings].map(([campaignId, brand]) => ({
          campaignId,
          brand,
        }))
      : undefined;
  }

  private applyCampaignBrandRegistry(
    accounts: MetaAdsAccountConfig[],
  ): MetaAdsAccountConfig[] {
    const registry = this.getCampaignBrandRegistry();
    if (!registry.length) {
      return accounts;
    }
    return accounts.map((account) => {
      const accountId = this.normalizeAccountId(account.accountId);
      const registryMappings = registry
        .filter((item) => item.accountId === accountId)
        .map(({ campaignId, brand }) => ({ campaignId, brand }));
      if (!registryMappings.length) {
        return account;
      }
      const mappings = new Map(
        (account.campaignBrandMappings || []).map((item) => [
          item.campaignId,
          item,
        ]),
      );
      for (const mapping of registryMappings) {
        const existing = mappings.get(mapping.campaignId);
        if (existing && existing.brand !== mapping.brand) {
          throw new BadRequestException(
            `Meta campaign brand mapping conflict for ${accountId}:${mapping.campaignId}: ${existing.brand} / ${mapping.brand}`,
          );
        }
        mappings.set(mapping.campaignId, mapping);
      }
      return {
        ...account,
        campaignBrandMappings: [...mappings.values()],
      };
    });
  }

  private getCampaignBrandRegistry() {
    const raw = (
      this.config.get<string>('META_ADS_CAMPAIGN_BRANDS_JSON', '') || ''
    ).trim();
    if (!raw) {
      return [] as Array<{
        accountId: string;
        campaignId: string;
        brand: string;
      }>;
    }
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : parsed?.campaigns;
      if (!Array.isArray(items)) {
        throw new Error('expected an array or campaigns array');
      }
      const entries = items.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }
        const record = item as Record<string, unknown>;
        const accountId = this.normalizeAccountId(
          this.optionalString(
            record.accountId || record.account_id || record.adAccountId,
          ) || '',
        );
        const campaignId = this.optionalString(
          record.campaignId || record.campaign_id || record.id,
        );
        const brand = this.optionalString(
          record.reportBrand || record.report_brand || record.brand,
        );
        return accountId && campaignId && brand
          ? [{ accountId, campaignId, brand }]
          : [];
      });
      const uniqueEntries = new Map<string, (typeof entries)[number]>();
      for (const entry of entries) {
        const key = `${entry.accountId}:${entry.campaignId}`;
        const existing = uniqueEntries.get(key);
        if (existing && existing.brand !== entry.brand) {
          throw new BadRequestException(
            `META_ADS_CAMPAIGN_BRANDS_JSON has conflicting brands for ${key}`,
          );
        }
        uniqueEntries.set(key, entry);
      }
      return [...uniqueEntries.values()];
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'META_ADS_CAMPAIGN_BRANDS_JSON is not valid JSON',
      );
    }
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
