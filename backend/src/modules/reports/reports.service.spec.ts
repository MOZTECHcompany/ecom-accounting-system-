import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService authoritative ads brand registry', () => {
  const config = (values: Record<string, string>) =>
    ({
      get: (key: string, fallback = '') => values[key] ?? fallback,
    }) as ConfigService;
  const connectorPrisma = (
    rows: Array<{ sourceModule: string; sourceId: string }> = [],
  ) =>
    ({
      expense: {
        findMany: jest.fn().mockResolvedValue(rows),
      },
    }) as unknown as PrismaService;

  it('removes the former hard-coded Meta account attribution', () => {
    const service = new ReportsService({} as PrismaService, config({}));

    expect(
      (
        service as unknown as {
          resolveMetaAdsBrand: (accountId: string) => unknown;
        }
      ).resolveMetaAdsBrand('act_412541399921576'),
    ).toMatchObject({
      resolvedBrand: '待對應',
      mappingStatus: 'unmapped',
      mappingSource: 'none',
    });
  });

  it('publishes account and campaign mapping coverage in connector readiness', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'configured',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          brandMode: 'portfolio',
          allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY'],
        },
      ]),
      META_ADS_CAMPAIGN_BRANDS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          campaignId: '120247330504490618',
          brand: 'AIRITY',
        },
      ]),
      GOOGLE_ADS_DEVELOPER_TOKEN: 'configured',
      GOOGLE_ADS_CLIENT_ID: 'configured',
      GOOGLE_ADS_CLIENT_SECRET: 'configured',
      GOOGLE_ADS_REFRESH_TOKEN: 'configured',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '8052579705',
          reportBrand: 'MOZTECH',
        },
      ]),
    };
    const service = new ReportsService(connectorPrisma(), config(values));

    const result = await service.getConnectorReadiness('tw-entity-001');
    const ads = result.connectors.find(
      (connector) => connector.key === 'ad-spend',
    );

    expect(ads).toMatchObject({
      releaseReady: true,
      brandMappingCoverage: {
        complete: true,
        combined: {
          complete: true,
          totalAccounts: 2,
          mappedAccounts: 2,
          unmappedAccounts: 0,
        },
        campaignRegistries: {
          meta: {
            present: true,
            valid: true,
            count: 1,
          },
        },
      },
    });
    expect(ads?.mappingPolicy).toContain(
      '帳號名稱、campaign 名稱與歷史描述不得用來猜品牌',
    );
  });

  it('fails report readiness closed when inline and external campaign mappings conflict', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'configured',
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
      GOOGLE_ADS_DEVELOPER_TOKEN: 'configured',
      GOOGLE_ADS_CLIENT_ID: 'configured',
      GOOGLE_ADS_CLIENT_SECRET: 'configured',
      GOOGLE_ADS_REFRESH_TOKEN: 'configured',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '8052579705',
          reportBrand: 'MOZTECH',
        },
      ]),
    };
    const service = new ReportsService(connectorPrisma(), config(values));

    const result = await service.getConnectorReadiness('tw-entity-001');
    const ads = result.connectors.find(
      (connector) => connector.key === 'ad-spend',
    );

    expect(ads).toMatchObject({
      releaseReady: false,
      brandMappingCoverage: {
        meta: {
          valid: false,
          error: expect.stringContaining(
            'conflicts with inline campaign mapping',
          ),
        },
      },
    });
    expect(ads?.releaseBlockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining('conflicts with inline campaign mapping'),
      ]),
    );
  });

  it('treats configured zero-row Meta and Google portfolios as dormant and release-ready', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'configured',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          brandMode: 'portfolio',
          allowedBrands: ['AIRITY', 'MOZTECH', 'BONSON', 'MORITEK'],
        },
      ]),
      GOOGLE_ADS_DEVELOPER_TOKEN: 'configured',
      GOOGLE_ADS_CLIENT_ID: 'configured',
      GOOGLE_ADS_CLIENT_SECRET: 'configured',
      GOOGLE_ADS_REFRESH_TOKEN: 'configured',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '6171193760',
          brandMode: 'portfolio',
          allowedBrands: ['AIRITY', 'MOZTECH', 'BONSON', 'MORITEK'],
        },
      ]),
    };
    const service = new ReportsService(connectorPrisma(), config(values));

    const result = await service.getConnectorReadiness('tw-entity-001');
    const ads = result.connectors.find(
      (connector) => connector.key === 'ad-spend',
    );

    expect(ads).toMatchObject({
      releaseReady: true,
      brandMappingCoverage: {
        complete: true,
        combined: {
          complete: true,
          totalAccounts: 2,
          mappedAccounts: 0,
          unmappedAccounts: 0,
          dormantPortfolioAccounts: 2,
          dormantPortfolioAccountRefs: [
            'GOOGLE_ADS:6171193760',
            'META_ADS:act_140675171327599',
          ],
          coveragePercent: 100,
        },
        meta: {
          complete: true,
          dormantPortfolioAccountRefs: ['act_140675171327599'],
        },
        google: {
          complete: true,
          dormantPortfolioAccountRefs: ['6171193760'],
        },
      },
    });
  });

  it('blocks dormant treatment as soon as either portfolio has stored campaign rows', async () => {
    const values: Record<string, string> = {
      META_ADS_ACCESS_TOKEN: 'configured',
      META_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          accountId: 'act_140675171327599',
          brandMode: 'portfolio',
          allowedBrands: ['AIRITY', 'MOZTECH', 'BONSON', 'MORITEK'],
        },
      ]),
      GOOGLE_ADS_DEVELOPER_TOKEN: 'configured',
      GOOGLE_ADS_CLIENT_ID: 'configured',
      GOOGLE_ADS_CLIENT_SECRET: 'configured',
      GOOGLE_ADS_REFRESH_TOKEN: 'configured',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '6171193760',
          brandMode: 'portfolio',
          allowedBrands: ['AIRITY', 'MOZTECH', 'BONSON', 'MORITEK'],
        },
      ]),
    };
    const service = new ReportsService(
      connectorPrisma([
        {
          sourceModule: 'meta_ads',
          sourceId: 'act_140675171327599:meta-unmapped-campaign:2026-08-03',
        },
        {
          sourceModule: 'google_ads',
          sourceId: '6171193760:google-unmapped-campaign:2026-08-03',
        },
      ]),
      config(values),
    );

    const result = await service.getConnectorReadiness('tw-entity-001');
    const ads = result.connectors.find(
      (connector) => connector.key === 'ad-spend',
    );

    expect(ads).toMatchObject({
      releaseReady: false,
      brandMappingCoverage: {
        complete: false,
        combined: {
          complete: false,
          totalAccounts: 2,
          unmappedAccounts: 2,
          dormantPortfolioAccounts: 0,
        },
        meta: {
          complete: false,
          unmappedAccountRefs: ['act_140675171327599'],
        },
        google: {
          complete: false,
          unmappedAccountRefs: ['6171193760'],
        },
      },
    });
    expect(ads?.releaseBlockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining('act_140675171327599'),
        expect.stringContaining('6171193760'),
      ]),
    );
  });

  it('isolates report spend under 待對應 when campaign mapping sources conflict', async () => {
    const prisma = {
      salesOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'expense-conflict',
            expenseDate: new Date('2026-08-01T00:00:00.000Z'),
            totalAmountOriginal: 500,
            description: 'Conflicting portfolio campaign',
            sourceId: 'act_140675171327599:120247330504490618:2026-08-01',
            sourceModule: 'meta_ads',
            items: [],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new ReportsService(
      prisma,
      config({
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
      }),
    );

    const result = await service.getAdPerformanceSummary(
      'tw-entity-001',
      'day',
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-01T23:59:59.999Z'),
    );

    expect(result.releaseReady).toBe(false);
    expect(result.adAccounts).toEqual([
      expect.objectContaining({
        accountRef: 'act_140675171327599',
        campaignRef: '120247330504490618',
        brand: '待對應',
        mappingStatus: 'unmapped',
        adSpend: 500,
      }),
    ]);
  });

  it('isolates unmapped spend under 待對應 and returns a release blocker', async () => {
    const prisma = {
      salesOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'expense-1',
            expenseDate: new Date('2026-08-01T00:00:00.000Z'),
            totalAmountOriginal: 1000,
            description: 'BONSON campaign name must not infer brand',
            sourceId: 'act_412541399921576:2026-08-01',
            sourceModule: 'meta_ads',
            items: [],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new ReportsService(prisma, config({}));

    const result = await service.getAdPerformanceSummary(
      'tw-entity-001',
      'day',
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-01T23:59:59.999Z'),
    );

    expect(result.releaseReady).toBe(false);
    expect(result.adAccounts).toEqual([
      expect.objectContaining({
        platform: 'META_ADS',
        accountRef: 'act_412541399921576',
        brand: '待對應',
        mappingStatus: 'unmapped',
        adSpend: 1000,
      }),
    ]);
    expect(result.brands).toEqual([
      expect.objectContaining({
        brand: '待對應',
        adSpend: 1000,
      }),
    ]);
    expect(result.diagnostics[0]).toContain('META_ADS_ACCOUNTS_JSON');
  });

  it('resolves portfolio spend from structured sourceId and exact campaign registry only', async () => {
    const prisma = {
      salesOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'expense-portfolio',
            expenseDate: new Date('2026-08-01T00:00:00.000Z'),
            totalAmountOriginal: 500,
            description: 'BONSON text must not override the registry',
            sourceId: 'act_140675171327599:120247330504490618:2026-08-01',
            sourceModule: 'meta_ads',
            items: [],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new ReportsService(
      prisma,
      config({
        META_ADS_ACCOUNTS_JSON: JSON.stringify([
          {
            accountId: 'act_140675171327599',
            name: '萬魔未來工學院 OMFUTURE',
            brandMode: 'portfolio',
            allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY'],
          },
        ]),
        META_ADS_CAMPAIGN_BRANDS_JSON: JSON.stringify([
          {
            accountId: 'act_140675171327599',
            campaignId: '120247330504490618',
            brand: 'AIRITY',
          },
        ]),
      }),
    );

    const result = await service.getAdPerformanceSummary(
      'tw-entity-001',
      'day',
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-01T23:59:59.999Z'),
    );

    expect(result.adAccounts).toEqual([
      expect.objectContaining({
        accountRef: 'act_140675171327599',
        accountName: '萬魔未來工學院 OMFUTURE',
        campaignRef: '120247330504490618',
        brand: 'AIRITY',
        mappingStatus: 'mapped',
        adSpend: 500,
      }),
    ]);
    expect(result.brands).toEqual([
      expect.objectContaining({
        brand: 'AIRITY',
        adSpend: 500,
      }),
    ]);
    expect(result.releaseReady).toBe(true);
  });
});
