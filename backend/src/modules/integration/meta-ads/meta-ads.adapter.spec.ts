import { ConfigService } from '@nestjs/config';
import { MetaAdsAdapter } from './meta-ads.adapter';

describe('MetaAdsAdapter account metadata', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('enriches configured accounts with the currency reported by Meta', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'test-token',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_123',
          reportBrand: 'MOZTECH',
        },
      ]),
    };
    const adapter = new MetaAdsAdapter({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService);

    global.fetch = jest.fn((input: string | URL | Request) => {
      const url = new URL(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      );
      if (url.pathname.endsWith('/me/adaccounts')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{
                id: 'act_123',
                account_id: '123',
                name: 'MOZTECH US',
                currency: 'USD',
              }],
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{
              account_id: '123',
              campaign_id: 'campaign-1',
              campaign_name: 'Revenue campaign',
              spend: '100',
              date_start: '2026-08-01',
              date_stop: '2026-08-01',
            }],
          }),
          { status: 200 },
        ),
      );
    }) as typeof fetch;

    const rows = await adapter.fetchInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
      level: 'campaign',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rawAccount).toMatchObject({
      accountId: 'act_123',
      reportBrand: 'MOZTECH',
      name: 'MOZTECH US',
      currency: 'USD',
    });
  });
});
