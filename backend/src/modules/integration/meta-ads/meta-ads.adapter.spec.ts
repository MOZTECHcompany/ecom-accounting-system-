import { ConfigService } from '@nestjs/config';
import { MetaAdsAdapter } from './meta-ads.adapter';

describe('MetaAdsAdapter account metadata', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('preserves the account currency reported by Meta insights', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'test-token',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_123',
          reportBrand: 'MOZTECH',
          currency: 'TWD',
        },
      ]),
    };
    const adapter = new MetaAdsAdapter({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService);

    let requestedFields = '';
    global.fetch = jest.fn((input: string | URL | Request) => {
      const url = new URL(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      );
      requestedFields = url.searchParams.get('fields') || '';
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                account_id: '123',
                campaign_id: 'campaign-1',
                campaign_name: 'Revenue campaign',
                account_currency: 'USD',
                spend: '100',
                date_start: '2026-08-01',
                date_stop: '2026-08-01',
              },
            ],
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
    expect(requestedFields).toContain('account_currency');
    expect(rows[0].currency).toBe('USD');
    expect(rows[0].currencySource).toBe('platform');
    expect(rows[0].rawAccount).toMatchObject({
      accountId: 'act_123',
      reportBrand: 'MOZTECH',
      currency: 'USD',
    });
  });

  it('uses and normalizes an explicit per-account currency when Meta omits the field', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'test-token',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_456',
          reportBrand: 'BONSON',
          currency: 'usd',
        },
      ]),
    };
    const adapter = new MetaAdsAdapter({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService);

    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                account_id: '456',
                spend: '50',
                date_start: '2026-08-01',
                date_stop: '2026-08-01',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    ) as typeof fetch;

    const rows = await adapter.fetchInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      currency: 'USD',
      currencySource: 'account_config',
      rawAccount: {
        accountId: 'act_456',
        currency: 'USD',
        currencySource: 'account_config',
      },
    });
  });

  it('fails the affected account instead of emitting a monetary row without currency', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'test-token',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_789',
          reportBrand: 'MOZTECH',
        },
      ]),
    };
    const adapter = new MetaAdsAdapter({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService);

    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                account_id: '789',
                spend: '25',
                date_start: '2026-08-01',
                date_stop: '2026-08-01',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    ) as typeof fetch;

    await expect(
      adapter.fetchInsights({
        since: new Date('2026-08-01T00:00:00.000Z'),
        until: new Date('2026-08-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(
      'Meta Ads account act_789 returned monetary metrics without a source currency',
    );
  });
});
