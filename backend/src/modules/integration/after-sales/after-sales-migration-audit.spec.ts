import {
  auditAfterSalesMigrationBatch,
  auditAfterSalesMigrationCandidate,
  checksumAfterSalesPayload,
} from './after-sales-migration-audit';

const validCase = (overrides: Record<string, unknown> = {}) => ({
  id: 'legacy-case-1',
  caseNumber: 'CASE-001',
  type: 'REPAIR',
  status: 'RECEIVED',
  sourceChannel: 'LINE',
  contactName: '測試客戶',
  registeredAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  deletedAt: null,
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: '500.00',
    },
  ],
  shipments: [],
  reverseShipments: [],
  paymentRecords: [],
  paymentRequests: [],
  paymentSubmissions: [],
  refundRecords: [],
  invoiceRecords: [],
  attachments: [],
  timeline: [],
  auditLog: [],
  notes: [],
  ...overrides,
});

describe('after-sales migration audit', () => {
  it('creates a stable checksum independent of object key order', () => {
    expect(checksumAfterSalesPayload({ b: 2, a: 1 })).toBe(
      checksumAfterSalesPayload({ a: 1, b: 2 }),
    );
  });

  it('accepts a complete source record without exposing its PII in the audit', () => {
    const result = auditAfterSalesMigrationCandidate(validCase());

    expect(result.decision).toBe('candidate');
    expect(result.issues).toEqual([]);
    expect(result.sourceRecordId).toBe('legacy-case-1');
    expect(result).not.toHaveProperty('payload');
    expect(result).not.toHaveProperty('contactName');
  });

  it('sends unmapped products and invalid values to review', () => {
    const result = auditAfterSalesMigrationCandidate(
      validCase({
        items: [
          {
            id: 'item-1',
            productId: null,
            quantity: 0,
            unitPrice: '-1',
          },
        ],
      }),
    );

    expect(result.decision).toBe('needs_review');
    expect(result.unmappedItems).toBe(1);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'product_mapping_required',
        'invalid_quantity',
        'invalid_amount',
      ]),
    );
  });

  it('marks duplicate source IDs as review instead of overwriting', () => {
    const result = auditAfterSalesMigrationBatch([validCase(), validCase()]);

    expect(result.status).toBe('needs_review');
    expect(result.summary.needsReview).toBe(2);
    expect(result.items[0].issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate_source_record' }),
    );
  });
});
