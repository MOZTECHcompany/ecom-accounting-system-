import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ExternalInvoiceIngestionService } from './external-invoice-ingestion.service';

describe('ExternalInvoiceIngestionService', () => {
  const order = {
    id: 'order-1',
    entityId: 'entity-1',
    totalGrossOriginal: new Decimal(1050),
    totalGrossCurrency: 'TWD',
    totalGrossFxRate: new Decimal(1),
  };

  it('rejects an invoice already linked to another order', async () => {
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'invoice-1',
          entityId: 'entity-1',
          orderId: 'order-2',
          status: 'issued',
        }),
      },
    };
    const service = new ExternalInvoiceIngestionService(prisma as never);

    await expect(
      service.ingest(order, {
        invoiceNumber: 'FW65846504',
        status: 'issued',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not downgrade an issued invoice to draft', async () => {
    const existing = {
      id: 'invoice-1',
      entityId: 'entity-1',
      orderId: 'order-1',
      status: 'issued',
      issuedAt: new Date('2026-09-01T00:00:00.000Z'),
      voidAt: null,
    };
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn(),
      },
      salesOrder: {
        update: jest.fn().mockResolvedValue({ id: 'order-1' }),
      },
    };
    const service = new ExternalInvoiceIngestionService(prisma as never);

    await service.ingest(order, {
      invoiceNumber: 'FW65846504',
      status: 'draft',
    });

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'issued' }),
      }),
    );
    expect(prisma.salesOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hasInvoice: true }),
      }),
    );
  });
});
