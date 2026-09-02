import {
  getAllowedAfterSalesTransitions,
  isAllowedAfterSalesTransition,
} from './after-sales-workflow.contract';

describe('after-sales workflow contract', () => {
  it('keeps payment and shipment as separate private-purchase stages', () => {
    expect(
      getAllowedAfterSalesTransitions({
        type: 'PRIVATE_PURCHASE',
        status: 'PENDING_PAYMENT',
      }),
    ).toEqual(['PAYMENT_CONFIRMED', 'CLOSED', 'CANCELLED']);
    expect(
      isAllowedAfterSalesTransition(
        { type: 'PRIVATE_PURCHASE', status: 'PENDING_PAYMENT' },
        'PENDING_SHIPMENT',
      ),
    ).toBe(false);
  });

  it('routes wrong-purchase exchanges through payment before replacement', () => {
    expect(
      getAllowedAfterSalesTransitions({
        type: 'EXCHANGE_RETURN',
        status: 'NEW',
        wrongPurchase: true,
      }),
    ).toEqual(['PENDING_PAYMENT', 'CANCELLED']);
    expect(
      getAllowedAfterSalesTransitions({
        type: 'EXCHANGE_RETURN',
        status: 'NEW',
      }),
    ).toEqual(['PENDING_REVERSE_SHIPMENT', 'CANCELLED']);
  });

  it('does not manufacture a refund stage for recall-only pickup', () => {
    expect(
      getAllowedAfterSalesTransitions({
        type: 'REFUND_PICKUP',
        status: 'REVERSE_IN_TRANSIT',
        recallOnly: true,
      }),
    ).toEqual(['CLOSED', 'CANCELLED']);
  });

  it('keeps customer issue records outside transactional workflow', () => {
    expect(
      getAllowedAfterSalesTransitions({
        type: 'CUSTOMER_ISSUE',
        status: 'NEW',
      }),
    ).toEqual([]);
  });
});
