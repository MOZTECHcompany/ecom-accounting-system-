import { InvoiceSyncService } from './invoice-sync.service';
import { InvoiceDirection } from './dto/invoice-source.dto';

describe('InvoiceSyncService', () => {
  const source = {
    id: 'source-1',
    entityId: 'entity-1',
    connector: 'gmail',
    sourceKey: 'finance@example.com',
    direction: 'incoming',
    displayName: null,
    status: 'ready',
    syncMode: 'read_only',
    credentialRef: 'secret://gmail-finance',
    cursor: null,
    config: null,
    lastSyncAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    entity: { taxId: '12345678' },
  };

  const buildPrisma = () => {
    const tx = {
      invoiceSourceEvidence: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      externalInvoiceRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const prisma = {
      invoiceSource: {
        findUnique: jest.fn().mockResolvedValue(source),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return { prisma, tx, service: new InvoiceSyncService(prisma as never) };
  };

  const validRecord = {
    externalRecordId: 'message-1:attachment-1',
    direction: InvoiceDirection.INCOMING as const,
    invoiceNumber: 'AB12345678',
    invoiceDate: '2026-08-31T00:00:00.000Z',
    sellerTaxId: '87654321',
    buyerTaxId: '12345678',
    amountNet: 1000,
    amountTax: 50,
    amountGross: 1050,
    evidenceHash: 'sha256-document-1',
    rawMetadata: {
      subject: 'invoice',
      accessToken: 'must-not-be-stored',
    },
  };

  it('stages a complete incoming invoice as ready and removes secrets from evidence', async () => {
    const { service, tx } = buildPrisma();
    tx.invoiceSourceEvidence.findUnique.mockResolvedValue(null);
    tx.externalInvoiceRecord.findUnique.mockResolvedValue(null);
    tx.externalInvoiceRecord.create.mockImplementation(async ({ data }) => ({
      id: 'record-1',
      ...data,
    }));
    tx.invoiceSourceEvidence.create.mockResolvedValue({ id: 'evidence-1' });

    const result = await service.ingestSourceRecords('source-1', {
      entityId: 'entity-1',
      records: [validRecord],
    });

    expect(result).toEqual(
      expect.objectContaining({
        created: 1,
        evidenceCreated: 1,
        ready: 1,
        needsReview: 0,
      }),
    );
    expect(tx.externalInvoiceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingestionStatus: 'ready',
          reviewReason: null,
        }),
      }),
    );
    expect(tx.invoiceSourceEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rawMetadata: { subject: 'invoice' },
        }),
      }),
    );
  });

  it('fails closed when the buyer tax id does not match the mapped entity', async () => {
    const { service, tx } = buildPrisma();
    tx.invoiceSourceEvidence.findUnique.mockResolvedValue(null);
    tx.externalInvoiceRecord.findUnique.mockResolvedValue(null);
    tx.externalInvoiceRecord.create.mockImplementation(async ({ data }) => ({
      id: 'record-1',
      ...data,
    }));
    tx.invoiceSourceEvidence.create.mockResolvedValue({ id: 'evidence-1' });

    const result = await service.ingestSourceRecords('source-1', {
      entityId: 'entity-1',
      records: [{ ...validRecord, buyerTaxId: '00000000' }],
    });

    expect(result.needsReview).toBe(1);
    expect(tx.externalInvoiceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingestionStatus: 'needs_review',
          reviewReason: expect.stringContaining('buyer_tax_id_mismatch'),
        }),
      }),
    );
  });

  it('updates the same source evidence idempotently without creating another record', async () => {
    const { service, tx } = buildPrisma();
    const record = {
      id: 'record-1',
      entityId: 'entity-1',
      direction: 'incoming',
      canonicalKey: 'existing-key',
      documentType: 'invoice',
      invoiceNumber: 'AB12345678',
      invoiceDate: new Date('2026-08-31T00:00:00.000Z'),
      sellerTaxId: '87654321',
      buyerTaxId: '12345678',
      amountNet: 1000,
      amountTax: 50,
      amountGross: 1050,
      amountCurrency: 'TWD',
      sourceStatus: 'issued',
      ingestionStatus: 'matched',
      reviewReason: null,
      matchedType: 'ap_invoice',
      matchedId: 'ap-1',
    };
    tx.invoiceSourceEvidence.findUnique.mockResolvedValue({
      id: 'evidence-1',
      recordId: 'record-1',
      record,
    });
    tx.externalInvoiceRecord.findUnique.mockResolvedValue(null);
    tx.externalInvoiceRecord.update.mockResolvedValue(record);
    tx.invoiceSourceEvidence.update.mockResolvedValue({ id: 'evidence-1' });

    const result = await service.ingestSourceRecords('source-1', {
      entityId: 'entity-1',
      records: [validRecord],
    });

    expect(result).toEqual(
      expect.objectContaining({
        created: 0,
        updated: 1,
        evidenceCreated: 0,
        evidenceUpdated: 1,
      }),
    );
    expect(tx.externalInvoiceRecord.create).not.toHaveBeenCalled();
    expect(tx.externalInvoiceRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ingestionStatus: 'matched' }),
      }),
    );
  });

  it('merges evidence from another source into an existing canonical invoice', async () => {
    const { service, prisma, tx } = buildPrisma();
    prisma.invoiceSource.findUnique.mockResolvedValue({
      ...source,
      id: 'source-2',
      sourceKey: 'ap@example.com',
    });
    const canonicalRecord = {
      id: 'record-1',
      invoiceNumber: 'AB12345678',
      invoiceDate: new Date('2026-08-31T00:00:00.000Z'),
      sellerTaxId: '87654321',
      buyerTaxId: '12345678',
      amountNet: 1000,
      amountTax: 50,
      amountGross: 1050,
      amountCurrency: 'TWD',
      sourceStatus: null,
      ingestionStatus: 'ready',
      reviewReason: null,
    };
    tx.invoiceSourceEvidence.findUnique.mockResolvedValue(null);
    tx.externalInvoiceRecord.findUnique.mockResolvedValue(canonicalRecord);
    tx.externalInvoiceRecord.update.mockResolvedValue(canonicalRecord);
    tx.invoiceSourceEvidence.create.mockResolvedValue({ id: 'evidence-2' });

    const result = await service.ingestSourceRecords('source-2', {
      entityId: 'entity-1',
      records: [{ ...validRecord, externalRecordId: 'forwarded-message-9' }],
    });

    expect(result.updated).toBe(1);
    expect(result.evidenceCreated).toBe(1);
    expect(tx.externalInvoiceRecord.create).not.toHaveBeenCalled();
    expect(tx.invoiceSourceEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recordId: 'record-1' }),
      }),
    );
  });
});
