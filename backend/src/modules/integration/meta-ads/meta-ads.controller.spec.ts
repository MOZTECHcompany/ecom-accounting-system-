import { MetaAdsController } from './meta-ads.controller';
import { MetaAdsService } from './meta-ads.service';

describe('MetaAdsController insights contract', () => {
  it('preserves currency-safe mixed-account totals from the service', async () => {
    const response = {
      success: true,
      range: {
        since: '2026-08-01T00:00:00.000Z',
        until: '2026-08-01T00:00:00.000Z',
      },
      level: 'campaign',
      count: 2,
      spendTotalsByCurrency: { TWD: 100, USD: 20 },
      spendTotal: null,
      spendTotalCurrency: null,
      sample: [
        { accountId: 'act_1', currency: 'TWD', spend: 100 },
        { accountId: 'act_2', currency: 'USD', spend: 20 },
      ],
    };
    const previewInsights = jest.fn().mockResolvedValue(response);
    const service = { previewInsights } as unknown as MetaAdsService;
    const controller = new MetaAdsController(service);

    const result = await controller.insights({
      since: '2026-08-01',
      until: '2026-08-01',
      accountIds: 'act_1, act_2',
      level: 'campaign',
      limit: '500',
      maxPages: '20',
    });

    expect(previewInsights).toHaveBeenCalledWith({
      since: new Date('2026-08-01'),
      until: new Date('2026-08-01'),
      accountIds: ['act_1', 'act_2'],
      level: 'campaign',
      limit: '500',
      maxPages: '20',
    });
    expect(result).toBe(response);
    expect(result.spendTotal).toBeNull();
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 100, USD: 20 });
  });
});
