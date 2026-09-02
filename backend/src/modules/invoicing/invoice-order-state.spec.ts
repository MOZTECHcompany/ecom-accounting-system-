import {
  buildInvoiceOrderStateWhere,
  missingIssuedInvoiceWhere,
} from './invoice-order-state';

describe('invoice order state', () => {
  it('defines missing invoice by the absence of an issued Invoice record', () => {
    expect(missingIssuedInvoiceWhere()).toEqual({
      invoices: {
        none: {
          status: { equals: 'issued', mode: 'insensitive' },
        },
      },
    });
  });

  it('uses the same missing-invoice predicate for paid and unpaid queues', () => {
    const state = buildInvoiceOrderStateWhere('entity-1');
    const missing = missingIssuedInvoiceWhere();

    expect(state.eligible.AND).toEqual(expect.arrayContaining([missing]));
    expect(state.waitingPayment.AND).toEqual(expect.arrayContaining([missing]));
  });
});
