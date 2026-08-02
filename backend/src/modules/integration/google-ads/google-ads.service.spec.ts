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
      spend: 250,
      conversions: 12,
      conversionsValue: 9876.5,
    });
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 250 });
    expect(result.spendTotal).toBe(250);
    expect(result.spendTotalCurrency).toBe('TWD');
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
          },
          {
            customerId: '9876543210',
            refreshTokenEnv: 'GOOGLE_ADS_REFRESH_TOKEN',
          },
        ],
        apiVersion: 'v21',
        loginCustomerId: null,
      }),
      listAccessibleCustomers: jest
        .fn()
        .mockResolvedValue(['1234567890', '9876543210']),
      fetchInsights: jest.fn().mockResolvedValue([
        {
          customerId: '1234567890',
          date: '2026-08-01',
          costMicros: '100000000',
          currency: 'TWD',
          currencySource: 'platform',
        },
        {
          customerId: '9876543210',
          date: '2026-08-01',
          costMicros: '20000000',
          currency: 'USD',
          currencySource: 'platform',
        },
      ]),
    } as unknown as GoogleAdsAdapter;
    const service = new GoogleAdsService({} as PrismaService, adapter, {
      get: (_key: string, fallback = '') => fallback,
    } as ConfigService);

    const result = await service.getReadiness();

    expect(result.ready).toBe(true);
    expect(result.insightProbe).toMatchObject({
      success: true,
      spendTotalsByCurrency: { TWD: 100, USD: 20 },
      spendTotal: null,
      spendTotalCurrency: null,
    });
  });
});
