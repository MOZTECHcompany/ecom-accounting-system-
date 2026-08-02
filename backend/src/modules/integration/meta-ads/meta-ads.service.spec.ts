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
      spend: 1000,
      actions: [{ action_type: 'purchase', value: 3 }],
      actionValues: [{ action_type: 'purchase', value: 4321.5 }],
      purchaseRoas: [{ action_type: 'purchase', value: 4.3215 }],
    });
  });
});
