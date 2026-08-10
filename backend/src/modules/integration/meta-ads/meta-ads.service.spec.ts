import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MetaAdsAdapter } from './meta-ads.adapter';
import { MetaAdsService } from './meta-ads.service';

describe('MetaAdsService reporting preview', () => {
  it('preserves bounded purchase actions, action values, and ROAS for reporting', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          account_id: 'act_123',
          campaign_id: 'campaign-1',
          campaign_name: 'Revenue campaign',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '1000',
          impressions: '5000',
          clicks: '250',
          actions: [
            { action_type: 'purchase', value: '3' },
            { action_type: 'invalid-negative', value: '-1' },
          ],
          action_values: [{ action_type: 'purchase', value: '4321.5' }],
          purchase_roas: [{ action_type: 'purchase', value: '4.3215' }],
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            accountId: 'act_123',
            reportBrand: 'MOZTECH',
            platform: 'Meta',
            currency: 'TWD',
          },
        },
      ]),
      normalizeAccountId: (value: string) => value,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
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
      spend: 1000,
      actions: [{ action_type: 'purchase', value: 3 }],
      actionValues: [{ action_type: 'purchase', value: 4321.5 }],
      purchaseRoas: [{ action_type: 'purchase', value: 4.3215 }],
    });
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 1000 });
    expect(result.spendTotal).toBe(1000);
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
      campaign_id: `campaign-${index + 1}`,
      campaign_name: `Campaign ${index + 1}`,
      date_start: '2026-08-01',
      date_stop: '2026-08-01',
      spend: '10',
      impressions: '100',
      clicks: '5',
      actions: [],
      action_values: [],
      purchase_roas: [],
      currency: 'TWD',
      currencySource: 'account_config' as const,
      rawAccount: {
        accountId: 'act_123',
        reportBrand: 'MOZTECH',
        platform: 'Meta',
        currency: 'TWD',
      },
    }));
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue(rows),
      normalizeAccountId: (value: string) => value,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.previewInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
      level: 'campaign',
      limit: 75,
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
          account_id: 'act_123',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '100',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: { accountId: 'act_123', currency: 'TWD' },
        },
        {
          account_id: 'act_456',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '20',
          currency: 'USD',
          currencySource: 'account_config',
          rawAccount: { accountId: 'act_456', currency: 'USD' },
        },
      ]),
      normalizeAccountId: (value: string) => value,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
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
    expect(result.sample.map((row) => row.resolvedBrand)).toEqual([
      '待對應',
      '待對應',
    ]);
    expect(result.brandMappingCoverage).toMatchObject({
      complete: false,
      totalAccounts: 2,
      unmappedAccounts: 2,
    });
  });

  it('rejects an unsafe runtime row instead of serializing currency null', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          account_id: 'act_123',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '100',
          rawAccount: { accountId: 'act_123' },
        },
      ]),
      normalizeAccountId: (value: string) => value,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    await expect(
      service.previewInsights({
        since: new Date('2026-08-01T00:00:00.000Z'),
        until: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow('Meta Ads preview is missing a valid source currency');
  });

  it('does not use the global default currency during expense sync', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          account_id: 'act_123',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '100',
          rawAccount: { accountId: 'act_123' },
        },
      ]),
      normalizeAccountId: (value: string) => value,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
      get: (key: string, fallback = '') =>
        key === 'META_ADS_DEFAULT_CURRENCY' ? 'TWD' : fallback,
    } as ConfigService);

    await expect(
      service.syncInsights({
        since: new Date('2026-08-01T00:00:00.000Z'),
        until: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(
      'Meta Ads sync account act_123 is missing a valid source currency',
    );
  });

  it('fails analysis readiness when a live portfolio campaign is not in the registry', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        tokenConfigured: true,
        configuredAccounts: [
          {
            accountId: 'act_140675171327599',
            brandMode: 'portfolio',
            allowedBrands: ['AIRITY'],
          },
        ],
        brandMappingCoverage: {
          complete: true,
          totalAccounts: 1,
          mappedAccounts: 1,
          unmappedAccounts: 0,
          coveragePercent: 100,
          mappedAccountRefs: ['act_140675171327599'],
          unmappedAccountRefs: [],
          diagnostics: [],
        },
        apiVersion: 'v23.0',
      }),
      fetchAdAccountsWithDiagnostics: jest.fn().mockResolvedValue({
        accounts: [{ id: 'act_140675171327599' }],
        businessMetadataAccess: {
          status: 'ready',
          fallbackUsed: false,
          diagnostic: null,
        },
      }),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          account_id: '140675171327599',
          campaign_id: 'new-unregistered-campaign',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '100',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            accountId: 'act_140675171327599',
            brandMode: 'portfolio',
            allowedBrands: ['AIRITY'],
          },
        },
      ]),
      normalizeAccountId: (value: string) =>
        value.startsWith('act_') ? value : `act_${value}`,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.transportReady).toBe(true);
    expect(result.readyForAnalysis).toBe(false);
    expect(result.releaseReady).toBe(false);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: 'act_140675171327599',
        status: 'rows_available',
        rowCount: 1,
      }),
    ]);
    expect(result.allConfiguredAccountsChecked).toBe(true);
    expect(result.brandMappingCoverage).toMatchObject({
      complete: false,
      unmappedAccounts: 1,
      unmappedAccountRefs: ['act_140675171327599'],
    });
  });

  it('reports configured no-spend accounts and visible-but-unconfigured Meta accounts without auto-including them', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        tokenConfigured: true,
        configuredAccounts: [
          {
            accountId: 'act_140675171327599',
            name: 'AIRITY',
            reportBrand: 'AIRITY',
          },
          {
            accountId: '412541399921576',
            name: 'Shared portfolio',
            brandMode: 'portfolio',
            allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY', 'MORITEK'],
          },
        ],
        apiVersion: 'v23.0',
      }),
      fetchAdAccountsWithDiagnostics: jest.fn().mockResolvedValue({
        accounts: [
          {
            id: 'act_140675171327599',
            name: 'AIRITY',
            currency: 'TWD',
          },
          {
            account_id: '412541399921576',
            name: 'BONSON',
            currency: 'TWD',
          },
          {
            account_id: '1047400912417236',
            name: 'DAILY LAB OFFICIAL',
            currency: 'TWD',
          },
          {
            id: 'act_791999392715510',
            name: 'MORITEK TW',
            currency: 'TWD',
          },
        ],
        businessMetadataAccess: {
          status: 'degraded',
          fallbackUsed: true,
          diagnostic:
            'Meta ads_read 可用，但 business_management 無法讀取 business metadata。',
        },
      }),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          account_id: '140675171327599',
          campaign_id: 'campaign-airity',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '100',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            accountId: 'act_140675171327599',
            reportBrand: 'AIRITY',
          },
        },
      ]),
      normalizeAccountId: (value: string) =>
        value.startsWith('act_') ? value : `act_${value}`,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.releaseReady).toBe(true);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: 'act_140675171327599',
        status: 'rows_available',
        rowCount: 1,
      }),
      expect.objectContaining({
        accountRef: 'act_412541399921576',
        status: 'checked_no_spend',
        rowCount: 0,
      }),
    ]);
    expect(result.allConfiguredAccountsChecked).toBe(true);
    expect(result.brandMappingCoverage).toMatchObject({
      complete: true,
      dormantPortfolioAccountRefs: ['act_412541399921576'],
    });
    expect(result.unconfiguredAccessibleAccounts).toEqual([
      {
        accountId: 'act_1047400912417236',
        name: 'DAILY LAB OFFICIAL',
        currency: 'TWD',
      },
      {
        accountId: 'act_791999392715510',
        name: 'MORITEK TW',
        currency: 'TWD',
      },
    ]);
    expect(result.degraded).toBe(true);
    expect(result.degradedDiagnostics).toEqual([
      expect.stringContaining('business_management'),
    ]);
    expect(adapter.fetchInsights).toHaveBeenCalledTimes(1);
  });

  it('keeps every configured Meta account unchecked when the full insight probe fails', async () => {
    const adapter = {
      getConnectionInfo: jest.fn().mockReturnValue({
        tokenConfigured: true,
        configuredAccounts: [
          { accountId: 'act_123', reportBrand: 'MOZTECH' },
          { accountId: 'act_456', reportBrand: 'BONSON' },
        ],
        apiVersion: 'v23.0',
      }),
      fetchAdAccountsWithDiagnostics: jest.fn().mockResolvedValue({
        accounts: [{ id: 'act_123' }, { id: 'act_456' }],
        businessMetadataAccess: {
          status: 'ready',
          fallbackUsed: false,
          diagnostic: null,
        },
      }),
      fetchInsights: jest
        .fn()
        .mockRejectedValue(new Error('Meta insight probe failed')),
      normalizeAccountId: (value: string) =>
        value.startsWith('act_') ? value : `act_${value}`,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.releaseReady).toBe(false);
    expect(result.allConfiguredAccountsChecked).toBe(false);
    expect(result.configuredAccountChecks).toEqual([
      expect.objectContaining({
        accountRef: 'act_123',
        status: 'unchecked',
      }),
      expect.objectContaining({
        accountRef: 'act_456',
        status: 'unchecked',
      }),
    ]);
  });

  it('syncs campaign-granular rows and removes the legacy account/day aggregate', async () => {
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
          account_id: '140675171327599',
          campaign_id: '120247330504490618',
          campaign_name: 'airity手持風扇',
          date_start: '2026-08-01',
          date_stop: '2026-08-01',
          spend: '100',
          currency: 'TWD',
          currencySource: 'platform',
          rawAccount: {
            accountId: 'act_140675171327599',
            name: '萬魔未來工學院 OMFUTURE',
            brandMode: 'portfolio',
            allowedBrands: ['AIRITY'],
            campaignBrandMappings: [
              {
                campaignId: '120247330504490618',
                brand: 'AIRITY',
              },
            ],
          },
        },
      ]),
      normalizeAccountId: (value: string) =>
        value.startsWith('act_') ? value : `act_${value}`,
    } as unknown as MetaAdsAdapter;
    const service = new MetaAdsService(prisma, adapter, {
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
    ).toBe('act_140675171327599:120247330504490618:2026-08-01');
    expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
      where: {
        entityId: 'tw-entity-001',
        sourceModule: 'meta_ads',
        sourceId: { in: ['act_140675171327599:2026-08-01'] },
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
