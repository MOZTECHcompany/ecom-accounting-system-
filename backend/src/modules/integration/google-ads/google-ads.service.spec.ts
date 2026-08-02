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
      spend: 250,
      conversions: 12,
      conversionsValue: 9876.5,
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
  });
});
