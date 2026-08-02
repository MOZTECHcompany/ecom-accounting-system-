import { ConfigService } from '@nestjs/config';
import { GoogleAdsAdapter } from './google-ads.adapter';

describe('GoogleAdsAdapter credential routing', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the configured OAuth credential for each account', async () => {
    const values: Record<string, string> = {
      GOOGLE_ADS_CLIENT_ID: 'client-id',
      GOOGLE_ADS_CLIENT_SECRET: 'client-secret',
      GOOGLE_ADS_DEVELOPER_TOKEN: 'developer-token',
      GOOGLE_ADS_MOZTECH_REFRESH_TOKEN: 'refresh-moztech',
      GOOGLE_ADS_BONSON_REFRESH_TOKEN: 'refresh-bonson',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '1111111111',
          refreshTokenEnv: 'GOOGLE_ADS_MOZTECH_REFRESH_TOKEN',
          loginCustomerId: '9999999999',
        },
        {
          customerId: '2222222222',
          refreshTokenEnv: 'GOOGLE_ADS_BONSON_REFRESH_TOKEN',
        },
      ]),
    };
    const config = {
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService;
    const adapter = new GoogleAdsAdapter(config);
    const searchAuthorization = new Map<string, string[]>();
    const searchLoginCustomerIds = new Map<string, Array<string | null>>();

    global.fetch = jest.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url === 'https://oauth2.googleapis.com/token') {
          const body = new URLSearchParams(
            init?.body instanceof URLSearchParams
              ? init.body
              : typeof init?.body === 'string'
                ? init.body
                : '',
          );
          const refreshToken = body.get('refresh_token');
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token:
                  refreshToken === 'refresh-moztech'
                    ? 'access-moztech'
                    : 'access-bonson',
              }),
              { status: 200 },
            ),
          );
        }

        const customerId =
          url.match(/\/customers\/(\d+)\/googleAds:search$/)?.[1] || '';
        const headers = new Headers(init?.headers);
        const seen = searchAuthorization.get(customerId) || [];
        seen.push(headers.get('authorization') || '');
        searchAuthorization.set(customerId, seen);
        const loginCustomerIds = searchLoginCustomerIds.get(customerId) || [];
        loginCustomerIds.push(headers.get('login-customer-id'));
        searchLoginCustomerIds.set(customerId, loginCustomerIds);
        const request = JSON.parse(
          typeof init?.body === 'string' ? init.body : '{}',
        ) as {
          query?: string;
        };
        if (request.query?.includes('FROM customer_client')) {
          return Promise.resolve(
            new Response(JSON.stringify({ results: [] }), { status: 200 }),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  customer: { id: customerId },
                  segments: { date: '2026-07-31' },
                  metrics: {
                    costMicros: '1000000',
                    conversions: '2',
                    conversionsValue: '3456.78',
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        );
      },
    ) as typeof fetch;

    const rows = await adapter.fetchInsights({
      since: new Date('2026-07-31T00:00:00.000Z'),
      until: new Date('2026-07-31T00:00:00.000Z'),
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.conversionsValue)).toEqual([
      '3456.78',
      '3456.78',
    ]);
    expect(searchAuthorization.get('1111111111')).toEqual([
      'Bearer access-moztech',
      'Bearer access-moztech',
    ]);
    expect(searchAuthorization.get('2222222222')).toEqual([
      'Bearer access-bonson',
      'Bearer access-bonson',
    ]);
    expect(searchLoginCustomerIds.get('1111111111')).toEqual([
      '9999999999',
      '9999999999',
    ]);
    expect(searchLoginCustomerIds.get('2222222222')).toEqual([null, null]);
    const searchBodies = (global.fetch as jest.Mock).mock.calls
      .map((call) =>
        JSON.parse(typeof call[1]?.body === 'string' ? call[1].body : '{}'),
      )
      .filter((body) => typeof body.query === 'string');
    expect(
      searchBodies.some((body) =>
        body.query.includes('metrics.conversions_value'),
      ),
    ).toBe(true);
  });

  it('keeps configured credential routing for explicitly requested IDs', async () => {
    const values: Record<string, string> = {
      GOOGLE_ADS_CLIENT_ID: 'client-id',
      GOOGLE_ADS_CLIENT_SECRET: 'client-secret',
      GOOGLE_ADS_DEVELOPER_TOKEN: 'developer-token',
      GOOGLE_ADS_BONSON_REFRESH_TOKEN: 'refresh-bonson',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '2222222222',
          refreshTokenEnv: 'GOOGLE_ADS_BONSON_REFRESH_TOKEN',
        },
      ]),
    };
    const config = {
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService;
    const adapter = new GoogleAdsAdapter(config);
    const authorization: string[] = [];

    global.fetch = jest.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url === 'https://oauth2.googleapis.com/token') {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: 'access-bonson' }), {
              status: 200,
            }),
          );
        }
        authorization.push(
          new Headers(init?.headers).get('authorization') || '',
        );
        return Promise.resolve(
          new Response(JSON.stringify({ results: [] }), { status: 200 }),
        );
      },
    ) as typeof fetch;

    await adapter.fetchInsights({
      since: new Date('2026-07-31T00:00:00.000Z'),
      until: new Date('2026-07-31T00:00:00.000Z'),
      customerIds: ['222-222-2222'],
    });

    expect(authorization).toEqual([
      'Bearer access-bonson',
      'Bearer access-bonson',
    ]);
  });

  it('enriches a non-manager account with its Google-reported currency', async () => {
    const values: Record<string, string> = {
      GOOGLE_ADS_CLIENT_ID: 'client-id',
      GOOGLE_ADS_CLIENT_SECRET: 'client-secret',
      GOOGLE_ADS_DEVELOPER_TOKEN: 'developer-token',
      GOOGLE_ADS_REFRESH_TOKEN: 'refresh-token',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '3333333333',
          reportBrand: 'MOZTECH',
        },
      ]),
    };
    const adapter = new GoogleAdsAdapter({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    } as ConfigService);

    global.fetch = jest.fn(
      (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url === 'https://oauth2.googleapis.com/token') {
          return Promise.resolve(
            new Response(JSON.stringify({ access_token: 'access-token' }), {
              status: 200,
            }),
          );
        }
        const request = JSON.parse(
          typeof init?.body === 'string' ? init.body : '{}',
        ) as { query?: string };
        if (request.query?.includes('FROM customer_client')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                results: [{
                  customerClient: {
                    id: '3333333333',
                    descriptiveName: 'MOZTECH Global',
                    manager: false,
                    status: 'ENABLED',
                    currencyCode: 'USD',
                  },
                }],
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [{
                customer: { id: '3333333333' },
                segments: { date: '2026-08-01' },
                metrics: { costMicros: '1000000' },
              }],
            }),
            { status: 200 },
          ),
        );
      },
    ) as typeof fetch;

    const rows = await adapter.fetchInsights({
      since: new Date('2026-08-01T00:00:00.000Z'),
      until: new Date('2026-08-01T00:00:00.000Z'),
      level: 'account',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rawAccount).toMatchObject({
      customerId: '3333333333',
      reportBrand: 'MOZTECH',
      name: 'MOZTECH Global',
      currency: 'USD',
    });
  });
});
