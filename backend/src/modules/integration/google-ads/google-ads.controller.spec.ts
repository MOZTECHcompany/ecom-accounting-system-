import { GoogleAdsController } from './google-ads.controller';
import { GoogleAdsService } from './google-ads.service';

describe('GoogleAdsController insights contract', () => {
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
        { customerId: '1111111111', currency: 'TWD', spend: 100 },
        { customerId: '2222222222', currency: 'USD', spend: 20 },
      ],
    };
    const previewInsights = jest.fn().mockResolvedValue(response);
    const service = { previewInsights } as unknown as GoogleAdsService;
    const controller = new GoogleAdsController(service);

    const result = await controller.insights({
      since: '2026-08-01',
      until: '2026-08-01',
      customerIds: '111-111-1111, 222-222-2222',
      level: 'campaign',
      pageSize: '500',
      maxPages: '20',
    });

    expect(previewInsights).toHaveBeenCalledWith({
      since: new Date('2026-08-01'),
      until: new Date('2026-08-01'),
      customerIds: ['111-111-1111', '222-222-2222'],
      level: 'campaign',
      pageSize: '500',
      maxPages: '20',
    });
    expect(result).toBe(response);
    expect(result.spendTotal).toBeNull();
    expect(result.spendTotalsByCurrency).toEqual({ TWD: 100, USD: 20 });
  });
});
