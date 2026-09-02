import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AfterSalesLegacyAdapter } from './after-sales-legacy.adapter';

const config = (values: Record<string, string>) => new ConfigService(values);

describe('AfterSalesLegacyAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fails closed when the service credential is missing', async () => {
    const adapter = new AfterSalesLegacyAdapter(
      config({ AFTER_SALES_LEGACY_BASE_URL: 'https://after-sales.example' }),
    );

    await expect(adapter.listCases({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(adapter.getReadiness()).resolves.toMatchObject({
      configured: false,
      connected: false,
      reason: 'not_configured',
    });
  });

  it('uses the bearer credential and preserves incremental query fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          page: { limit: 20, hasMore: false, nextCursor: null },
          contractVersion: '2026-09-02.v1',
          sourceCommit: '523792c',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    global.fetch = fetchMock;

    const adapter = new AfterSalesLegacyAdapter(
      config({
        AFTER_SALES_LEGACY_BASE_URL: 'https://after-sales.example/',
        AFTER_SALES_LEGACY_API_KEY: 'service-secret',
      }),
    );

    await adapter.listCases({
      limit: 20,
      cursor: 'case-20',
      updatedAfter: '2026-09-01T00:00:00.000Z',
      includeDeleted: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/integration/v1/cases?');
    expect(url).toContain('limit=20');
    expect(url).toContain('cursor=case-20');
    expect(url).toContain('includeDeleted=true');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer service-secret',
    });
    expect(init.cache).toBe('no-store');
    expect(init.redirect).toBe('error');
  });

  it('uses Cloud Run service identity without replacing the application credential', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response('cloud-run-id-token', { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            mode: 'read_only',
            contractVersion: '2026-09-02.v1',
            sourceCommit: '6ed5d6d',
            featureBaseline: '523792c',
            checkedAt: '2026-09-02T00:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    global.fetch = fetchMock;

    const adapter = new AfterSalesLegacyAdapter(
      config({
        AFTER_SALES_LEGACY_BASE_URL: 'https://after-sales-staging.example',
        AFTER_SALES_LEGACY_API_KEY: 'application-secret',
        AFTER_SALES_LEGACY_USE_CLOUD_RUN_IAM: 'true',
      }),
    );

    await expect(adapter.getReadiness()).resolves.toMatchObject({
      connected: true,
      sourceCommit: '6ed5d6d',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [metadataUrl, metadataInit] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(metadataUrl.hostname).toBe('metadata.google.internal');
    expect(metadataUrl.searchParams.get('audience')).toBe(
      'https://after-sales-staging.example',
    );
    expect(metadataInit.headers).toMatchObject({
      'Metadata-Flavor': 'Google',
    });

    const [, serviceInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(serviceInit.headers).toMatchObject({
      Authorization: 'Bearer application-secret',
      'X-Serverless-Authorization': 'Bearer cloud-run-id-token',
    });
  });

  it('does not turn an upstream authorization failure into empty data', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const adapter = new AfterSalesLegacyAdapter(
      config({
        AFTER_SALES_LEGACY_BASE_URL: 'https://after-sales.example',
        AFTER_SALES_LEGACY_API_KEY: 'rejected-secret',
      }),
    );

    await expect(adapter.listCases({})).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('preserves not-found semantics for a case detail query', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const adapter = new AfterSalesLegacyAdapter(
      config({
        AFTER_SALES_LEGACY_BASE_URL: 'https://after-sales.example',
        AFTER_SALES_LEGACY_API_KEY: 'service-secret',
      }),
    );

    await expect(adapter.getCase('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
