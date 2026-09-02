import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AfterSalesLegacyAdapter } from './after-sales-legacy.adapter';
import { auditAfterSalesMigrationCandidate } from './after-sales-migration-audit';
import { AfterSalesMigrationService } from './after-sales-migration.service';

const sourceItem = {
  id: 'legacy-case-1',
  caseNumber: 'CASE-001',
  type: 'REPAIR',
  status: 'RECEIVED',
  sourceChannel: 'LINE',
  contactName: '測試客戶',
  registeredAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  deletedAt: null,
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: '500.00',
    },
  ],
  shipments: [],
  reverseShipments: [],
  paymentRecords: [],
  paymentRequests: [],
  paymentSubmissions: [],
  refundRecords: [],
  invoiceRecords: [],
  attachments: [],
  timeline: [],
  auditLog: [],
  notes: [],
};

const createFixture = () => {
  const legacyAdapter = {
    listCases: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'legacy-case-1',
          caseNumber: 'CASE-001',
          type: 'REPAIR',
          status: 'RECEIVED',
        },
      ],
      page: { limit: 25, hasMore: false, nextCursor: null },
      contractVersion: '2026-09-02.v1',
      sourceCommit: '6ed5d6d',
      featureBaseline: '523792c',
    }),
    getCase: jest.fn().mockResolvedValue({
      item: sourceItem,
      contractVersion: '2026-09-02.v1',
      sourceCommit: '6ed5d6d',
      featureBaseline: '523792c',
    }),
  };
  const upsert = jest.fn().mockResolvedValue({ id: 'candidate-1' });
  const tx = {
    afterSalesImportRun: {
      create: jest.fn().mockResolvedValue({
        id: 'run-1',
        status: 'ready',
        contractVersion: '2026-09-02.v1',
        sourceCommit: '6ed5d6d',
        featureBaseline: '523792c',
      }),
    },
    afterSalesImportCandidate: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert,
    },
  };
  const prisma = {
    entity: {
      findUnique: jest.fn().mockResolvedValue({ id: 'entity-1' }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const config = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  return {
    service: new AfterSalesMigrationService(
      legacyAdapter as unknown as AfterSalesLegacyAdapter,
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    ),
    legacyAdapter,
    prisma,
    tx,
    upsert,
  };
};

describe('AfterSalesMigrationService', () => {
  it('previews a page without writing any staging or formal record', async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.previewPage({ limit: 25 }),
    ).resolves.toMatchObject({
      mode: 'dry_run',
      audit: { status: 'ready', summary: { total: 1, candidate: 1 } },
    });
    expect(fixture.prisma.$transaction).not.toHaveBeenCalled();
    expect(fixture.tx.afterSalesImportRun.create).not.toHaveBeenCalled();
    expect(fixture.upsert).not.toHaveBeenCalled();
  });

  it('writes only idempotent staging candidates', async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.stagePage('entity-1', { limit: 25 }),
    ).resolves.toMatchObject({
      mode: 'staging',
      runId: 'run-1',
      status: 'ready',
      summary: { total: 1, candidate: 1 },
      effects: { created: 1, updated: 0, unchanged: 0 },
    });

    expect(fixture.tx.afterSalesImportRun.create).toHaveBeenCalledTimes(1);
    expect(fixture.upsert).toHaveBeenCalledTimes(1);
    expect(fixture.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entityId_sourceSystem_sourceRecordId: {
            entityId: 'entity-1',
            sourceSystem: 'legacy_after_sales',
            sourceRecordId: 'legacy-case-1',
          },
        },
      }),
    );
  });

  it('reports checksum-identical reruns as unchanged', async () => {
    const fixture = createFixture();
    fixture.tx.afterSalesImportCandidate.findUnique.mockResolvedValue({
      checksum: auditAfterSalesMigrationCandidate(sourceItem).checksum,
    });

    await expect(
      fixture.service.stagePage('entity-1', { limit: 25 }),
    ).resolves.toMatchObject({
      effects: { created: 0, updated: 0, unchanged: 1 },
    });
  });

  it('reports a changed source checksum as an update', async () => {
    const fixture = createFixture();
    fixture.tx.afterSalesImportCandidate.findUnique.mockResolvedValue({
      checksum: 'previous-checksum',
    });

    await expect(
      fixture.service.stagePage('entity-1', { limit: 25 }),
    ).resolves.toMatchObject({
      effects: { created: 0, updated: 1, unchanged: 0 },
    });
  });
});
