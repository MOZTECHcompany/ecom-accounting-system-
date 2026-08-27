import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { UnifiedOrder } from '../interfaces/sales-channel-adapter.interface';
import { OneShopHttpAdapter } from './one-shop.adapter';

const createAdapter = () =>
  new OneShopHttpAdapter({
    get: (_key: string, fallback: unknown) => fallback,
  } as ConfigService);

const createOrder = (raw: Record<string, unknown>): UnifiedOrder => ({
  externalId: 'order-1',
  orderDate: new Date('2026-08-27T00:00:00.000Z'),
  status: 'pending',
  items: [],
  totals: {
    currency: 'TWD',
    gross: new Decimal(1000),
    tax: new Decimal(0),
    discount: new Decimal(0),
    shipping: new Decimal(0),
    net: new Decimal(1000),
  },
  raw,
});

describe('OneShop payment identity', () => {
  it('does not convert a pending logistics identifier into a full-value payment', () => {
    const adapter = createAdapter();
    const order = createOrder({
      payment_status: 'pending',
      logistics_third_party_no: 'logistics-1',
      cart: { total_price: 1000 },
    });

    expect((adapter as any).mapOrderToUnifiedTransaction(order)).toBeNull();
  });

  it('uses the payment provider identifier for a completed payment', () => {
    const adapter = createAdapter();
    const order = createOrder({
      payment_status: 'completed',
      payment_third_party_no: 'payment-1',
      logistics_third_party_no: 'logistics-1',
      cart: { total_price: 1000 },
    });

    const result = (adapter as any).mapOrderToUnifiedTransaction(order);

    expect(result.externalId).toBe('payment-1');
    expect(result.amount.toNumber()).toBe(1000);
  });
});
