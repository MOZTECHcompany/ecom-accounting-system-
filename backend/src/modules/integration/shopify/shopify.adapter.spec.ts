import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { UnifiedOrder } from '../interfaces/sales-channel-adapter.interface';
import { ShopifyHttpAdapter } from './shopify.adapter';

const createAdapter = () =>
  new ShopifyHttpAdapter({
    get: (_key: string, fallback: unknown) => fallback,
  } as ConfigService);

const order: UnifiedOrder = {
  externalId: 'order-1',
  orderDate: new Date('2026-08-27T00:00:00.000Z'),
  status: 'completed',
  items: [],
  totals: {
    currency: 'TWD',
    gross: new Decimal(1000),
    tax: new Decimal(0),
    discount: new Decimal(0),
    shipping: new Decimal(0),
    net: new Decimal(1000),
  },
  raw: {},
};

describe('Shopify transaction classification', () => {
  it.each([
    ['authorization', 'authorization'],
    ['void', 'void'],
    ['capture', 'sale'],
    ['refund', 'refund'],
  ])(
    'maps Shopify %s without treating it as another sale',
    async (kind, expected) => {
      const result = await (createAdapter() as any).mapToUnifiedTransaction(
        {
          id: 1,
          kind,
          status: 'success',
          amount: '1000',
          currency: 'TWD',
          created_at: '2026-08-27T00:00:00.000Z',
        },
        order,
      );

      expect(result.type).toBe(expected);
    },
  );
});
