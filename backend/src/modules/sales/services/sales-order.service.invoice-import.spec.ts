import { SalesOrderService } from './sales-order.service';

describe('SalesOrderService ECPay invoice matching', () => {
  const createService = (prisma: Record<string, unknown> = {}) =>
    new SalesOrderService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

  it('normalizes the opaque suffix used by 1SHOP ECPay relate numbers', () => {
    const service = createService();

    expect(
      (service as any).buildEcpayRelateNumberVariants('DI1234567890aiLmJm12'),
    ).toEqual(expect.arrayContaining(['DI1234567890aiLmJm12', 'DI1234567890']));
  });

  it('only matches the canonical source order', async () => {
    const prisma = {
      salesOrder: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = createService(prisma);

    await (service as any).findSalesOrderForEcpayInvoiceImport({
      entityId: 'entity-1',
      merchantKey: 'shopify-main',
      merchantId: '3290494',
      invoiceNumber: 'AA12345678',
      relateNumber: '#1001',
    });

    expect(prisma.salesOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({
              entityId: 'entity-1',
              channel: { code: { in: ['SHOPIFY'] } },
            }),
            {
              OR: [
                { sourceOrderKey: { not: null } },
                { externalOrderId: null },
                { externalOrderId: '' },
              ],
            },
          ],
        },
      }),
    );
  });
});
