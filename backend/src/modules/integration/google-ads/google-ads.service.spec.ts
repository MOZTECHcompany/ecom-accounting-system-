import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GoogleAdsAdapter } from './google-ads.adapter';
import { GoogleAdsService } from './google-ads.service';

describe('GoogleAdsService reporting preview', () => {
  it('preserves conversion value for managed advertising reports', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          campaignId: 'campaign-1',
          campaignName: 'Search campaign',
          date: '2026-08-01',
          costMicros: '250000000',
          impressions: '8000',
          clicks: '400',
          conversions: '12',
          conversionsValue: '9876.5',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            customerId: '1234567890',
            reportBrand: 'MOZTECH',
            platform: 'Google Ads',
            currency: 'TWD',
          },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.previewInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
      level: 'campaign',
    });

    expect(result.sample[0]).toMatchObject({
      currency: 'TWD',
      currencySource: 'platform',
      resolvedBrand: 'MOZTECH',
      mappingStatus: 'mapped',
      spend: 250,
      conversions: 12,
      conversionsValue: 9876.5,
    });
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 250 });
    expect(result.spendTotal).toBe(250);
    expect(result.spendTotalCurrency).toBe('TWD');
    expect(result.brandMappingCoverage).toMatchObject({
      complete: true,
      totalAccounts: 1,
      mappedAccounts: 1,
      unmappedAccounts: 0,
    });
  });

  it('returns the requested managed-report rows beyond the old 50-row preview cap', async () => {
    const rows = Array.from({ length: 75 }, (_, index) => ({
      customerId: '1234567890',
      campaignId: `campaign-${index + 1}`,
      campaignName: `Campaign ${index + 1}`,
      date: '2026-08-01',
      costMicros: '10000000',
      impressions: '100',
      clicks: '5',
      conversions: '1',
      conversionsValue: '20',
      currency: 'TWD',
      currencySource: 'account_config' as const,
      rawAccount: {
        customerId: '1234567890',
        reportBrand: 'MOZTECH',
        platform: 'Google Ads',
        currency: 'TWD',
      },
    }));
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue(rows),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.previewInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
      level: 'campaign',
      pageSize: 75,
    });

    expect(result.count).toBe(75);
    expect(result.sample).toHaveLength(75);
    expect(result.sample.every((row) => row.currency === 'TWD')).toBe(true);
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 750 });
  });

  it('splits mixed-currency spend and makes the unsafe scalar explicitly null', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          date: '2026-08-01',
          costMicros: '100000000',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: { customerId: '1234567890', currency: 'TWD' },
        },
        {
          customerId: '9876543210',
          date: '2026-08-01',
          costMicros: '20000000',
          currency: 'USD',
          currencySource: 'account_config',
          rawAccount: { customerId: '9876543210', currency: 'USD' },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.previewInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(result.spendTotalsByCurrency).toEqual({ TWD: 100, USD: 20 });
    expect(result.spendTotal).toBeNull();
    expect(result.spendTotalCurrency).toBeNull();
    expect(result.sample.map((row) => row.currency)).toEqual(['TWD', 'USD']);
  });

  it('rejects an unsafe runtime row instead of serializing currency null', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          date: '2026-08-01',
          costMicros: '100000000',
          rawAccount: { customerId: '1234567890' },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    await expect(
      service.previewInsights({
        since: new Date('2026-08-01T00:00:00.000Z'),
        until: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow('Google Ads preview is missing a valid source currency');
  });

  it('does not use the global default currency during expense sync', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          date: '2026-08-01',
          costMicros: '100000000',
          rawAccount: { customerId: '1234567890' },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (key: string, fallback = '') =>
        key === 'GOOGLE_ADS_DEFAULT_CURRENCY' ? 'TWD' : fallback,
    } as ConfigService);

    await expect(
      service.syncInsights({
        since: new Date('2026-08-01T00:00:00.000Z'),
        until: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(
      'Google Ads sync account 1234567890 is missing a valid source currency',
    );
  });

  it('keeps the readiness probe currency-safe for multiple accounts', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        developerTokenConfigured: true,
        oauthConfigured: true,
        missingRefreshTokenEnvs: [],
        configuredAccounts: [
          {
            customerId: '1234567890',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            reportBrand: 'MOZTECH',
          },
          {
            customerId: '9876543210',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            reportBrand: 'BONSON',
          },
        ],
        apiVersion: 'v25',
        loginCustomerId: null,
      }),
      listAccessibleCustomers: jest
        .fn()
        .mockResolvedValue(['1111111111', '6171193760']),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          date: '2026-08-01',
          costMicros: '100000000',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            customerId: '1234567890',
            reportBrand: 'MOZTECH',
          },
        },
        {
          customerId: '9876543210',
          date: '2026-08-01',
          costMicros: '20000000',
          currency: 'USD',
          currencySource: 'platform',
          rawAccount: {
            customerId: '9876543210',
            reportBrand: 'BONSON',
          },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.ready).toBe(true);
    expect(result.accessibleCustomers).toEqual(['1111111111', '6171193760']);
    expect(result.unconfiguredAccessibleAccounts).toEqual([
      {
        customerId: '1111111111',
        name: null,
        currency: null,
        credentialSources: ['GOOGLE_ADS_REFRESH_TOKEN'],
      },
      {
        customerId: '6171193760',
        name: null,
        currency: null,
        credentialSources: ['GOOGLE_ADS_REFRESH_TOKEN'],
      },
    ]);
    expect(result.inaccessibleConfiguredAccounts).toEqual([]);
    expect(result.unverifiedConfiguredAccounts).toEqual([]);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: '1234567890',
        status: 'rows_available',
        rowCount: 1,
      }),
      expect.objectContaining({
        accountRef: '9876543210',
        status: 'rows_available',
        rowCount: 1,
      }),
    ]);
    expect(result.allConfiguredAccountsChecked).toBe(true);
    expect(result.insightProbe).toMatchObject({
      success: true,
      spendTotalsByCurrency: { TWD: 100, USD: 20 },
      spendTotal: null,
      spendTotalCurrency: null,
    });
    expect(result.brandMappingCoverage).toMatchObject({
      complete: true,
      mappedAccounts: 2,
      unmappedAccounts: 0,
    });
  });

  it('marks a configured Google account checked_no_spend after the full probe succeeds', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        developerTokenConfigured: true,
        oauthConfigured: true,
        missingRefreshTokenEnvs: [],
        configuredAccounts: [
          {
            customerId: '1234567890',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            reportBrand: 'MOZTECH',
          },
          {
            customerId: '6171193760',
            name: '萬魔未來工學院',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            brandMode: 'portfolio',
            allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY', 'MORITEK'],
          },
        ],
        apiVersion: 'v25',
        loginCustomerId: '1111111111',
      }),
      listAccessibleCustomers: jest
        .fn()
        .mockResolvedValue(['1111111111', '6171193760']),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          date: '2026-08-01',
          costMicros: '1000000',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            customerId: '1234567890',
            reportBrand: 'MOZTECH',
          },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.releaseReady).toBe(true);
    expect(result.allConfiguredAccountsChecked).toBe(true);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: '1234567890',
        status: 'rows_available',
      }),
      expect.objectContaining({
        accountRef: '6171193760',
        status: 'checked_no_spend',
      }),
    ]);
    expect(result.brandMappingCoverage).toMatchObject({
      complete: true,
      dormantPortfolioAccountRefs: ['6171193760'],
    });
    expect(result.inaccessibleConfiguredAccounts).toEqual([]);
    expect(result.unconfiguredAccessibleAccounts).toEqual([]);
  });

  it('blocks release when a portfolio account starts spending on an unmapped campaign', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        developerTokenConfigured: true,
        oauthConfigured: true,
        missingRefreshTokenEnvs: [],
        configuredAccounts: [
          {
            customerId: '6171193760',
            name: '萬魔未來工學院',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            brandMode: 'portfolio',
            allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY', 'MORITEK'],
          },
        ],
        apiVersion: 'v25',
        loginCustomerId: null,
      }),
      listAccessibleCustomers: jest.fn().mockResolvedValue(['6171193760']),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '6171193760',
          campaignId: 'new-unmapped-campaign',
          date: '2026-08-01',
          costMicros: '1000000',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            customerId: '6171193760',
            name: '萬魔未來工學院',
            brandMode: 'portfolio',
            allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY', 'MORITEK'],
          },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.transportReady).toBe(true);
    expect(result.releaseReady).toBe(false);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: '6171193760',
        status: 'rows_available',
      }),
    ]);
    expect(result.brandMappingCoverage).toMatchObject({
      complete: false,
      unmappedAccountRefs: ['6171193760'],
      dormantPortfolioAccountRefs: [],
    });
  });

  it('keeps every configured Google account unchecked when the full insight probe fails', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        developerTokenConfigured: true,
        oauthConfigured: true,
        missingRefreshTokenEnvs: [],
        configuredAccounts: [
          {
            customerId: '1234567890',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            reportBrand: 'MOZTECH',
          },
          {
            customerId: '9876543210',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
            reportBrand: 'BONSON',
          },
        ],
        apiVersion: 'v25',
        loginCustomerId: '1111111111',
      }),
      listAccessibleCustomers: jest.fn().mockResolvedValue(['1111111111']),
      fetchInsights: jest
        .fn()
        .mockRejectedValue(new Error('Google insight probe failed')),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.releaseReady).toBe(false);
    expect(result.allConfiguredAccountsChecked).toBe(false);
    expect(result.unverifiedConfiguredAccounts).toEqual([
      '1234567890',
      '9876543210',
    ]);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: '1234567890',
        status: 'unchecked',
      }),
      expect.objectContaining({
        accountRef: '9876543210',
        status: 'unchecked',
      }),
    ]);
  });

  it('keeps transport readiness separate from analysis release readiness', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        developerTokenConfigured: true,
        oauthConfigured: true,
        missingRefreshTokenEnvs: [],
        configuredAccounts: [
          {
            customerId: '1406751713',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
          },
        ],
        apiVersion: 'v25',
        loginCustomerId: null,
      }),
      listAccessibleCustomers: jest.fn().mockResolvedValue(['1406751713']),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1406751713',
          date: '2026-08-01',
          costMicros: '1000000',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: { customerId: '1406751713' },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.transportReady).toBe(true);
    expect(result.readyForAnalysis).toBe(false);
    expect(result.releaseReady).toBe(false);
    expect(result.brandMappingCoverage.unmappedAccountRefs).toEqual([
      '1406751713',
    ]);
  });

  it('syncs campaign-granular rows and removes the legacy customer/day aggregate', async () => {
    const prisma = {
      expense: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'expense-campaign' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '8052579705',
          customerName: 'MOZTECH 墨子科技',
          campaignId: '18082231625',
          campaignName: '動態搜尋',
          date: '2026-08-01',
          costMicros: '100000000',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            customerId: '8052579705',
            name: 'MOZTECH 墨子科技',
            reportBrand: 'MOZTECH_TW',
            brandMode: 'single',
          },
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService(prisma, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.syncInsights({
      entityId: 'tw-entity-001',
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T23:59:59.999Z'),
    });

    expect(adapter.fetchInsights).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'campaign' }),
    );
    expect(
      (prisma.expense.create as jest.Mock).mock.calls[0][0].data.sourceId,
    ).toBe('8052579705:18082231625:2026-08-01');
    expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
      where: {
        entityId: 'tw-entity-001',
        sourceModule: 'google_ads',
        sourceId: { in: ['8052579705:2026-08-01'] },
      },
    });
    expect(result).toMatchObject({
      created: 1,
      updated: 0,
      deletedLegacyAggregates: 1,
      releaseReady: true,
    });
  });
});
