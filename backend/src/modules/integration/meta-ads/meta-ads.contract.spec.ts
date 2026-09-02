import { ConfigService } from '@nestjs/config';
import { MetaAdsAdapter } from './meta-ads.adapter';
import { MetaAdsService } from './meta-ads.service';

describe('Meta Ads advertising metric contract', () => {
  it('requests action values and enriches rows with authoritative account currency', async () => {
    const adapter = new MetaAdsAdapter(
      new ConfigService({
        META_ADS_ACCESS_TOKEN: 'test-token',
        META_ADS_ACCOUNTS_JSON: JSON.stringify([
          {
            accountId: '123456789',
            brand: 'MOZTECH',
            reportBrand: 'MOZTECH_TW',
          },
        ]),
      }),
    ) as unknown as MetaAdsAdapter & {
      request: jest.Mock;
    };
    const request = jest.fn(async (path: string) => {
      if (path === '/act_123456789') {
        return {
          id: 'act_123456789',
          account_id: '123456789',
          name: 'MOZTECH Meta',
          currency: 'TWD',
        };
      }
      return {
        data: [
          {
            account_id: '123456789',
            spend: '1200',
            actions: [{ action_type: 'purchase', value: '3' }],
            action_values: [{ action_type: 'purchase', value: '5000' }],
            date_start: '2026-08-26',
            date_stop: '2026-08-26',
          },
        ],
      };
    });
    adapter.request = request;

    const rows = await adapter.fetchInsights({
      since: new Date('2026-08-26T00:00:00Z'),
      until: new Date('2026-08-26T23:59:59Z'),
    });

    const insightCall = request.mock.calls.find(([path]) =>
      String(path).endsWith('/insights'),
    );
    expect(insightCall?.[1]?.fields).toContain('action_values');
    expect(rows[0].rawAccount).toMatchObject({
      accountId: 'act_123456789',
      currency: 'TWD',
      brand: 'MOZTECH',
      reportBrand: 'MOZTECH_TW',
    });
  });

  it('preserves complete Meta metric evidence in insight previews', async () => {
    const adapter = {
      normalizeAccountId: (value: string) =>
        value.startsWith('act_') ? value : `act_${value}`,
      fetchInsights: jest.fn().mockResolvedValue([
        {
          account_id: '123456789',
          spend: '1200',
          actions: [{ action_type: 'purchase', value: '3' }],
          action_values: [{ action_type: 'purchase', value: '5000' }],
          purchase_roas: [{ action_type: 'purchase', value: '4.1667' }],
          date_start: '2026-08-26',
          date_stop: '2026-08-26',
          rawAccount: {
            accountId: 'act_123456789',
            currency: 'TWD',
          },
        },
      ]),
    };
    const service = new MetaAdsService(
      {} as never,
      adapter as unknown as MetaAdsAdapter,
      { get: jest.fn().mockReturnValue('') } as unknown as ConfigService,
    );

    const result = await service.previewInsights({
      since: new Date('2026-08-26T00:00:00Z'),
      until: new Date('2026-08-26T23:59:59Z'),
    });

    expect(result.sample[0]).toMatchObject({
      currency: 'TWD',
      actions: [{ action_type: 'purchase', value: '3' }],
      actionValues: [{ action_type: 'purchase', value: '5000' }],
      purchaseRoas: [{ action_type: 'purchase', value: '4.1667' }],
    });
  });
});
