import {
  buildSalesOrderSourceKey,
  canonicalSalesOrderWhere,
} from './sales-order-integrity';

describe('sales order integrity', () => {
  it('builds a stable identity from channel and external order ID', () => {
    expect(buildSalesOrderSourceKey(' channel-1 ', ' order-123 ')).toBe(
      'channel-1:order-123',
    );
  });

  it('rejects incomplete source identities', () => {
    expect(() => buildSalesOrderSourceKey('', 'order-123')).toThrow(
      'Sales order source key requires channel and external order IDs.',
    );
    expect(() => buildSalesOrderSourceKey('channel-1', '  ')).toThrow(
      'Sales order source key requires channel and external order IDs.',
    );
  });

  it('preserves the caller filter while excluding non-canonical source rows', () => {
    expect(
      canonicalSalesOrderWhere({
        entityId: 'entity-1',
        OR: [{ status: 'paid' }, { status: 'completed' }],
      }),
    ).toEqual({
      AND: [
        {
          entityId: 'entity-1',
          OR: [{ status: 'paid' }, { status: 'completed' }],
        },
        {
          OR: [
            { sourceOrderKey: { not: null } },
            { externalOrderId: null },
            { externalOrderId: '' },
          ],
        },
      ],
    });
  });
});
