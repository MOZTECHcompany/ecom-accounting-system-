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
      spend: 1000,
      actions: [{ action_type: 'purchase', value: 3 }],
      actionValues: [{ action_type: 'purchase', value: 4321.5 }],
      purchaseRoas: [{ action_type: 'purchase', value: 4.3215 }],
    });
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 1000 });
    expect(result.spendTotal).toBe(1000);
    expect(result.spendTotalCurrency).toBe('TWD');
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
});
