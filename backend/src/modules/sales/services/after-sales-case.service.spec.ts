import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AfterSalesCaseService } from './after-sales-case.service';

const buildCase = (overrides: Record<string, unknown> = {}) => ({
  id: 'case-1',
  entityId: 'entity-1',
  caseNo: 'AS-20260902-001',
  status: 'awaiting_payment',
  paymentStatus: 'pending',
  paymentAmountOriginal: new Decimal(500),
  items: [
    {
      id: 'item-1',
      paymentRequired: true,
      paymentAmountOriginal: new Decimal(500),
      unitPriceOriginal: new Decimal(500),
      quantity: new Decimal(1),
    },
  ],
  ...overrides,
});

const createService = (record = buildCase()) => {
  type UpdateInput = { data: Record<string, unknown> };
  const prisma = {
    afterSalesCase: {
      findFirst: jest.fn().mockResolvedValue(record),
      update: jest.fn(({ data }: UpdateInput) =>
        Promise.resolve({ ...record, ...data }),
      ),
    },
    invoice: {
      create: jest.fn(),
    },
  };
  const config = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  return {
    service: new AfterSalesCaseService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    ),
    prisma,
  };
};

describe('AfterSalesCaseService payment and invoice boundary', () => {
  it('confirms payment without manufacturing an issued invoice', async () => {
    const { service, prisma } = createService();

    const result = (await service.markPaid(
      'entity-1',
      'case-1',
    )) as unknown as {
      paymentStatus: string;
      status: string;
    };

    expect(result.paymentStatus).toBe('paid');
    expect(result.status).toBe('accounting_invoice');
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.afterSalesCase.update).toHaveBeenCalledTimes(1);

    const update = prisma.afterSalesCase.update.mock.calls[0][0];
    expect(update.data).toMatchObject({
      paymentStatus: 'paid',
      status: 'accounting_invoice',
    });
    expect(update.data.paidAt).toBeInstanceOf(Date);
    expect(update.data).not.toHaveProperty('invoiceId');
    expect(update.data).not.toHaveProperty('invoiceNumber');
    expect(update.data).not.toHaveProperty('invoiceIssuedAt');
    expect(update.data).not.toHaveProperty('accountingReceivedAt');
  });

  it('is idempotent when payment is already confirmed', async () => {
    const { service, prisma } = createService(
      buildCase({ paymentStatus: 'paid', status: 'accounting_invoice' }),
    );

    await expect(service.markPaid('entity-1', 'case-1')).resolves.toMatchObject(
      {
        paymentStatus: 'paid',
      },
    );
    expect(prisma.afterSalesCase.update).not.toHaveBeenCalled();
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it('rejects payment confirmation from the wrong workflow stage', async () => {
    const { service, prisma } = createService(
      buildCase({ status: 'warehouse_receiving' }),
    );

    await expect(service.markPaid('entity-1', 'case-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.afterSalesCase.update).not.toHaveBeenCalled();
  });

  it('rejects warehouse and shipping transitions that skip their prior stage', async () => {
    const { service, prisma } = createService(
      buildCase({ status: 'accounting_invoice', paymentStatus: 'paid' }),
    );

    await expect(
      service.confirmWarehouseReceived('entity-1', 'case-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.ship('entity-1', 'case-1', { trackingNo: 'TRACK-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.afterSalesCase.update).not.toHaveBeenCalled();
  });
});
