import { ConfigService } from '@nestjs/config';
import { ShoplineService } from './shopline.service';

describe('ShoplineService automatic sync coordination', () => {
  const createService = (acquireResult: unknown) => {
    const coordinator = {
      acquire: jest.fn().mockResolvedValue(acquireResult),
      markSuccess: jest.fn().mockResolvedValue({ count: 1 }),
      markFailure: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const service = new ShoplineService(
      {} as never,
      {} as never,
      new ConfigService({
        SHOPLINE_SYNC_ENABLED: 'true',
        SHOPLINE_SYNC_LOOKBACK_MINUTES: '240',
      }),
      {} as never,
      coordinator as never,
      { ingest: jest.fn() } as never,
    );

    return { service, coordinator };
  };

  it('does not call the upstream APIs when another trigger owns the lease', async () => {
    const { service } = createService({
      acquired: false,
      runningSince: new Date('2026-09-01T00:00:00.000Z'),
      leaseExpiresAt: new Date('2026-09-01T00:30:00.000Z'),
    });
    const orders = jest.spyOn(service, 'syncOrders');
    const customers = jest.spyOn(service, 'syncCustomers');
    const transactions = jest.spyOn(service, 'syncTransactions');

    const result = await service.autoSync({ trigger: 'scheduler' });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        skipped: true,
        reason: 'already_running',
      }),
    );
    expect(orders).not.toHaveBeenCalled();
    expect(customers).not.toHaveBeenCalled();
    expect(transactions).not.toHaveBeenCalled();
  });

  it('records one successful result after the coordinated sync finishes', async () => {
    const lease = {
      entityId: 'tw-entity-001',
      connector: 'shopline',
      lockToken: 'lease-3',
    };
    const { service, coordinator } = createService({
      acquired: true,
      lease,
    });
    jest
      .spyOn(service, 'syncOrders')
      .mockResolvedValue({
        success: true,
        fetched: 3,
        created: 1,
        updated: 2,
      } as never);
    jest
      .spyOn(service, 'syncCustomers')
      .mockResolvedValue({
        success: true,
        fetched: 4,
        created: 0,
        updated: 4,
      } as never);
    jest
      .spyOn(service, 'syncTransactions')
      .mockResolvedValue({
        success: true,
        fetched: 2,
        created: 1,
        updated: 1,
      } as never);

    const result = await service.autoSync({ trigger: 'scheduler' });

    expect(result).toEqual(
      expect.objectContaining({ success: true, entityId: 'tw-entity-001' }),
    );
    expect(coordinator.markSuccess).toHaveBeenCalledWith(
      lease,
      expect.objectContaining({
        orders: expect.objectContaining({ fetched: 3 }),
        customers: expect.objectContaining({ fetched: 4 }),
        transactions: expect.objectContaining({ fetched: 2 }),
      }),
    );
  });

  it('persists an active SHOPLINE invoice from the authoritative order payload', async () => {
    const ingestion = {
      ingest: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
    };
    const service = new ShoplineService(
      {} as never,
      {} as never,
      new ConfigService(),
      {} as never,
      {} as never,
      ingestion as never,
    );

    await (service as any).syncEmbeddedInvoice(
      {
        id: 'order-1',
        entityId: 'entity-1',
        totalGrossOriginal: '1050',
        totalGrossCurrency: 'TWD',
        totalGrossFxRate: '1',
      },
      {
        raw: {
          invoice: {
            invoice_number: 'fw65846504',
            invoice_status: 'active',
            invoice_date: '2026-09-01',
          },
        },
      },
    );

    expect(ingestion.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', entityId: 'entity-1' }),
      expect.objectContaining({
        invoiceNumber: 'FW65846504',
        status: 'issued',
        issuedAt: new Date('2026-09-01'),
        externalPlatform: 'shopline',
      }),
    );
  });

  it('fails closed when SHOPLINE does not provide an authoritative invoice status', async () => {
    const ingestion = { ingest: jest.fn() };
    const service = new ShoplineService(
      {} as never,
      {} as never,
      new ConfigService(),
      {} as never,
      {} as never,
      ingestion as never,
    );

    const result = await (service as any).syncEmbeddedInvoice(
      {
        id: 'order-1',
        entityId: 'entity-1',
        totalGrossOriginal: '1050',
        totalGrossCurrency: 'TWD',
        totalGrossFxRate: '1',
      },
      {
        raw: {
          invoice: {
            invoice_number: 'FW65846504',
            invoice_status: 'pending',
          },
        },
      },
    );

    expect(result).toBeNull();
    expect(ingestion.ingest).not.toHaveBeenCalled();
  });
});
