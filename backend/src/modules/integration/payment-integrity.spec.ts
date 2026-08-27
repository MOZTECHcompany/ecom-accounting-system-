import { Decimal } from '@prisma/client/runtime/library';
import {
  buildPaymentSourceTransactionKey,
  resolveStoredGrossAmount,
  resolveStoredPaymentStatus,
  selectEffectiveReceivablePayments,
} from './payment-integrity';
import { UnifiedTransaction } from './interfaces/sales-channel-adapter.interface';

const transaction = (
  overrides: Partial<UnifiedTransaction> = {},
): UnifiedTransaction => ({
  externalId: 'txn-1',
  orderId: 'order-1',
  date: new Date('2026-08-27T00:00:00.000Z'),
  type: 'sale',
  amount: new Decimal(100),
  fee: new Decimal(0),
  net: new Decimal(100),
  currency: 'TWD',
  status: 'success',
  raw: {},
  ...overrides,
});

describe('payment integrity invariants', () => {
  it('builds a stable provider transaction identity', () => {
    expect(buildPaymentSourceTransactionKey('channel-1', 'txn-1')).toBe(
      'channel-1:txn-1',
    );
  });

  it('does not recognize authorization, failed, or pending events as received money', () => {
    expect(
      resolveStoredPaymentStatus(transaction({ type: 'authorization' })),
    ).toBe('ignored');
    expect(resolveStoredPaymentStatus(transaction({ status: 'failed' }))).toBe(
      'failed',
    );
    expect(resolveStoredPaymentStatus(transaction({ status: 'pending' }))).toBe(
      'pending',
    );
  });

  it('stores successful refunds as negative receivable movement', () => {
    expect(
      resolveStoredGrossAmount(
        transaction({ type: 'refund', amount: new Decimal(100) }),
      ).toNumber(),
    ).toBe(-100);
  });

  it('counts an identical provider transaction once and excludes pending rows', () => {
    const effective = selectEffectiveReceivablePayments([
      {
        id: 'duplicate-a',
        sourceTransactionKey: null,
        payoutBatchId: 'provider-1',
        channel: 'SHOPLINE',
        status: 'completed',
        reconciledFlag: false,
        createdAt: new Date('2026-08-27T00:00:00.000Z'),
      },
      {
        id: 'duplicate-b',
        sourceTransactionKey: 'channel-1:provider-1',
        payoutBatchId: 'provider-1',
        channel: 'SHOPLINE',
        status: 'completed',
        reconciledFlag: false,
        createdAt: new Date('2026-08-27T00:00:01.000Z'),
      },
      {
        id: 'pending-logistics',
        sourceTransactionKey: 'channel-1:logistics-1',
        payoutBatchId: 'logistics-1',
        channel: '1SHOP',
        status: 'pending',
        reconciledFlag: false,
        createdAt: new Date('2026-08-27T00:00:02.000Z'),
      },
    ]);

    expect(effective.map((payment) => payment.id)).toEqual(['duplicate-b']);
  });
});
