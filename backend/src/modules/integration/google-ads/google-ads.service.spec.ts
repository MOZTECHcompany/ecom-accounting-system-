import { ConfigService } from '@nestjs/config';
import { GoogleAdsAdapter } from './google-ads.adapter';
import { GoogleAdsService } from './google-ads.service';

describe('GoogleAdsService expense identity', () => {
  const insight = {
    customerId: '8052579705',
    customerName: 'MOZTECH 墨子科技',
    date: '2026-08-26',
    costMicros: 8_430_320_000,
    impressions: 13_301,
    clicks: 628,
    conversions: 44,
    rawAccount: {
      customerId: '8052579705',
      name: 'MOZTECH 墨子科技',
      brand: 'MOZTECH',
      reportBrand: 'MOZTECH_TW',
      platform: 'Google Ads',
      market: 'TW',
      businessUnit: '台灣官網',
      channelCode: 'moztech_tw_google',
    },
  };

  it('keeps the canonical expense and removes a legacy duplicate for the same customer and date', async () => {
    const prisma = {
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'legacy-expense',
            sourceId: 'google-ads-805-257-9705-2026-08-26',
            description: 'Google Ads 廣告費 MOZTECH 2026-08-26',
            createdAt: new Date('2026-08-26T01:00:00Z'),
            items: [{ description: 'customer=805-257-9705' }],
          },
          {
            id: 'canonical-expense',
            sourceId: '8052579705:2026-08-26',
            description: 'Google Ads 廣告費 MOZTECH 2026-08-26',
            createdAt: new Date('2026-08-27T09:50:00Z'),
            items: [{ description: 'customer=8052579705' }],
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      expenseItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
    };
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([insight]),
    };
    const config = {
      get: jest.fn().mockReturnValue(''),
    };
    const service = new GoogleAdsService(
      prisma as never,
      adapter as unknown as GoogleAdsAdapter,
      config as unknown as ConfigService,
    );

    const result = await service.syncInsights({
      entityId: 'tw-entity-001',
      since: new Date('2026-08-26T00:00:00Z'),
      until: new Date('2026-08-26T23:59:59Z'),
    });

    expect(result).toMatchObject({
      fetched: 1,
      synced: 1,
      created: 0,
      updated: 1,
      deduplicated: 1,
    });
    expect(prisma.expense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'canonical-expense' },
        data: expect.objectContaining({
          sourceId: '8052579705:2026-08-26',
        }),
      }),
    );
    expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-expense'] } },
    });
  });

  it('preserves authoritative currency and conversion value in insight previews', async () => {
    const adapter = {
      fetchInsights: jest.fn().mockResolvedValue([
        {
          ...insight,
          conversionsValue: 96_500,
          rawAccount: {
            ...insight.rawAccount,
            currency: 'TWD',
          },
        },
      ]),
    };
    const service = new GoogleAdsService(
      {} as never,
      adapter as unknown as GoogleAdsAdapter,
      { get: jest.fn().mockReturnValue('') } as unknown as ConfigService,
    );

    const result = await service.previewInsights({
      since: new Date('2026-08-26T00:00:00Z'),
      until: new Date('2026-08-26T23:59:59Z'),
    });

    expect(result.sample[0]).toMatchObject({
      currency: 'TWD',
      conversions: 44,
      conversionsValue: 96_500,
    });
  });
});
