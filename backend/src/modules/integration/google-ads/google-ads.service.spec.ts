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
});
