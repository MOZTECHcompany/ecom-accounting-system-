import { ConfigService } from '@nestjs/config';
import { MetaAdsAdapter, MetaAdsApiRequestException } from './meta-ads.adapter';

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

  it('maps a portfolio account only through the exact campaign registry', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'test-token',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          name: '萬魔未來工學院 OMFUTURE',
          brandMode: 'portfolio',
          allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY'],
          currency: 'TWD',
        },
      ]),
      META_ADS_CAMPAIGN_BRANDS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          campaignId: '120247330504490618',
          brand: 'AIRITY',
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
                account_id: '140675171327599',
                campaign_id: '120247330504490618',
                campaign_name: '名稱不參與品牌判斷',
                account_currency: 'TWD',
                spend: '100',
                date_start: '2026-08-01',
                date_stop: '2026-08-01',
              },
              {
                account_id: '140675171327599',
                campaign_id: 'unregistered-campaign',
                campaign_name: 'airity 名稱也不能取代主檔',
                account_currency: 'TWD',
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
      level: 'campaign',
    });

    expect(rows[0].brandMapping).toMatchObject({
      resolvedBrand: 'AIRITY',
      mappingStatus: 'mapped',
      mappingSource: 'account_config.campaignBrandMapping',
    });
    expect(rows[1].brandMapping).toMatchObject({
      resolvedBrand: '待對應',
      mappingStatus: 'unmapped',
      mappingSource: 'none',
    });
    expect(adapter.getConnectionInfo().brandMappingCoverage).toMatchObject({
      complete: true,
      mappedAccounts: 1,
      unmappedAccounts: 0,
    });
  });

  it('falls back to ads_read account fields when Meta withholds business metadata', async () => {
    const adapter = new MetaAdsAdapter({
      get: (key: string, fallback = '') =>
        key === 'META_ADS_ACCESS_TOKEN' ? 'test-token' : fallback,
    } as ConfigService);
    const requestedFields: string[] = [];

    global.fetch = jest.fn((input: string | URL | Request) => {
      const url = new URL(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      );
      const fields = url.searchParams.get('fields') || '';
      requestedFields.push(fields);
      if (fields.includes('business{id,name}')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                message:
                  '(#100) Requires business_management permission to access the field.',
                type: 'OAuthException',
                code: 100,
              },
            }),
            { status: 400 },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'act_123',
                account_id: '123',
                name: 'MOZTECH',
                currency: 'TWD',
                account_status: 1,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }) as typeof fetch;

    const result = await adapter.fetchAdAccountsWithDiagnostics();
    expect(result.accounts).toEqual([
      {
        id: 'act_123',
        account_id: '123',
        name: 'MOZTECH',
        currency: 'TWD',
        account_status: 1,
      },
    ]);
    expect(result.businessMetadataAccess).toEqual({
      status: 'degraded',
      fallbackUsed: true,
      diagnostic: expect.stringContaining('business_management'),
    });
    expect(requestedFields).toHaveLength(2);
    expect(requestedFields[0]).toContain('business{id,name}');
    expect(requestedFields[1]).not.toContain('business');
  });

  it.each([
    {
      code: 190,
      type: 'OAuthException',
      subcode: 463,
      message:
        'Requires business_management permission to access the business field.',
    },
    {
      code: 100,
      type: 'OAuthException',
      subcode: 0,
      message: 'Requires ads_management permission to access the field.',
    },
    {
      code: 100,
      type: 'GraphMethodException',
      subcode: 0,
      message:
        'Requires business_management permission to access the business field.',
    },
  ])(
    'does not hide a non-matching Meta error ($code/$type)',
    async ({ code, type, subcode, message }) => {
      const adapter = new MetaAdsAdapter({
        get: (key: string, fallback = '') =>
          key === 'META_ADS_ACCESS_TOKEN' ? 'test-token' : fallback,
      } as ConfigService);
      global.fetch = jest.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                message,
                type,
                code,
                error_subcode: subcode,
              },
            }),
            { status: 400 },
          ),
        ),
      ) as typeof fetch;

      await expect(adapter.fetchAdAccounts()).rejects.toMatchObject({
        constructor: MetaAdsApiRequestException,
        metaCode: code,
        metaType: type,
        metaSubcode: subcode,
        metaMessage: message,
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects an inline and external campaign brand conflict', () => {
    const values: Record<string, string> = {
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          brandMode: 'portfolio',
          allowedBrands: ['AIRITY', 'BONSON'],
          campaignBrandMappings: [
            {
              campaignId: '120247330504490618',
              brand: 'AIRITY',
            },
          ],
        },
      ]),
      META_ADS_CAMPAIGN_BRANDS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          campaignId: '120247330504490618',
          brand: 'BONSON',
        },
      ]),
    };
    const adapter = new MetaAdsAdapter({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService);

    expect(() => adapter.getConfiguredAccounts()).toThrow(
      /campaign brand mapping conflict/,
    );
  });
});
