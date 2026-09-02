import { ConnectorSyncCoordinatorService } from './connector-sync-coordinator.service';

describe('ConnectorSyncCoordinatorService', () => {
  const createService = () => {
    const prisma = {
      $queryRaw: jest.fn(),
      connectorSyncState: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    return {
      prisma,
      service: new ConnectorSyncCoordinatorService(prisma as never),
    };
  };

  it('acquires the database lease when no live worker owns it', async () => {
    const { prisma, service } = createService();
    prisma.$queryRaw.mockImplementation(async (query: { values: unknown[] }) => [
      { lockToken: query.values[4] },
    ]);

    const result = await service.acquire({
      entityId: 'tw-entity-001',
      connector: 'SHOPLINE',
      trigger: 'scheduler',
    });

    expect(result.acquired).toBe(true);
    expect('lease' in result && result.lease.connector).toBe('shopline');
    expect(prisma.connectorSyncState.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed when another live worker already owns the lease', async () => {
    const { prisma, service } = createService();
    const lastStartedAt = new Date('2026-09-01T00:00:00.000Z');
    const leaseExpiresAt = new Date('2026-09-01T00:30:00.000Z');
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.connectorSyncState.findUnique.mockResolvedValue({
      lastStartedAt,
      leaseExpiresAt,
    });

    const result = await service.acquire({
      entityId: 'tw-entity-001',
      connector: 'shopline',
      trigger: 'webhook',
    });

    expect(result).toEqual({
      acquired: false,
      runningSince: lastStartedAt,
      leaseExpiresAt,
    });
  });

  it('only completes the state owned by the same lock token', async () => {
    const { prisma, service } = createService();
    prisma.connectorSyncState.updateMany.mockResolvedValue({ count: 1 });

    await service.markSuccess(
      {
        entityId: 'tw-entity-001',
        connector: 'shopline',
        lockToken: 'lease-1',
      },
      { fetched: 12 },
    );

    expect(prisma.connectorSyncState.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entityId: 'tw-entity-001',
          connector: 'shopline',
          lockToken: 'lease-1',
        },
        data: expect.objectContaining({
          status: 'success',
          lockToken: null,
          lastMetrics: { fetched: 12 },
        }),
      }),
    );
  });

  it('records the failure without releasing a newer worker lease', async () => {
    const { prisma, service } = createService();
    prisma.connectorSyncState.updateMany.mockResolvedValue({ count: 1 });

    await service.markFailure(
      {
        entityId: 'tw-entity-001',
        connector: 'shopline',
        lockToken: 'lease-2',
      },
      new Error('upstream unavailable'),
    );

    expect(prisma.connectorSyncState.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lockToken: 'lease-2' }),
        data: expect.objectContaining({
          status: 'failed',
          lockToken: null,
          lastError: 'upstream unavailable',
        }),
      }),
    );
  });
});
