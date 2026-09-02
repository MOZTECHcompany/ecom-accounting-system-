import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  IngestInvoiceSourceRecordsDto,
  InvoiceDirection,
  InvoiceDocumentType,
  InvoiceSourceConnector,
  InvoiceSourceRecordDto,
  UpsertInvoiceSourceDto,
} from './dto/invoice-source.dto';

const TERMINAL_INGESTION_STATUSES = new Set([
  'matched',
  'imported',
  'rejected',
]);
const SECRET_METADATA_KEYS =
  /(?:access[_-]?token|refresh[_-]?token|authorization|password|secret|hash[_-]?(?:key|iv)|api[_-]?key|cookie)/i;

@Injectable()
export class InvoiceSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertSource(dto: UpsertInvoiceSourceDto) {
    const entityId = dto.entityId.trim();
    const sourceKey = this.normalizeSourceKey(dto.connector, dto.sourceKey);
    await this.assertEntityExists(entityId);

    if (
      dto.connector === InvoiceSourceConnector.GMAIL &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sourceKey)
    ) {
      throw new BadRequestException('Gmail sourceKey must be an email address');
    }

    const source = await this.prisma.invoiceSource.upsert({
      where: {
        entityId_connector_sourceKey_direction: {
          entityId,
          connector: dto.connector,
          sourceKey,
          direction: dto.direction,
        },
      },
      create: {
        entityId,
        connector: dto.connector,
        sourceKey,
        direction: dto.direction,
        displayName: dto.displayName?.trim() || null,
        status:
          dto.connector === InvoiceSourceConnector.MANUAL_EXPORT
            ? 'ready'
            : 'authorization_required',
        syncMode: 'read_only',
      },
      update: {
        displayName: dto.displayName?.trim() || undefined,
      },
    });

    return this.toSafeSource(source);
  }

  async listSources(entityId: string) {
    const sources = await this.prisma.invoiceSource.findMany({
      where: { entityId: entityId.trim() },
      orderBy: [{ connector: 'asc' }, { sourceKey: 'asc' }],
    });
    return sources.map((source) => this.toSafeSource(source));
  }

  async getReadiness(entityId: string) {
    const sources = await this.listSources(entityId);
    const ready = sources.filter((source) => source.status === 'ready');
    const incoming = ready.filter(
      (source) =>
        source.direction === InvoiceDirection.INCOMING ||
        source.direction === InvoiceDirection.BOTH,
    );
    const outgoing = ready.filter(
      (source) =>
        source.direction === InvoiceDirection.OUTGOING ||
        source.direction === InvoiceDirection.BOTH,
    );

    return {
      entityId: entityId.trim(),
      ready: incoming.length > 0 || outgoing.length > 0,
      counts: {
        configured: sources.length,
        ready: ready.length,
        incomingReady: incoming.length,
        outgoingReady: outgoing.length,
        authorizationRequired: sources.filter(
          (source) => source.status === 'authorization_required',
        ).length,
      },
      sources,
      blockers: [
        ...(incoming.length
          ? []
          : ['No authorized incoming-invoice source is configured']),
        ...(outgoing.length
          ? []
          : ['No authorized outgoing-invoice source is configured']),
      ],
    };
  }

  async ingestSourceRecords(
    sourceId: string,
    payload: IngestInvoiceSourceRecordsDto,
  ) {
    const source = await this.prisma.invoiceSource.findUnique({
      where: { id: sourceId },
      include: { entity: { select: { taxId: true } } },
    });
    if (!source) {
      throw new NotFoundException('Invoice source not found');
    }
    if (source.entityId !== payload.entityId.trim()) {
      throw new BadRequestException(
        'Invoice source and requested company do not match',
      );
    }

    const result = {
      received: payload.records.length,
      created: 0,
      updated: 0,
      evidenceCreated: 0,
      evidenceUpdated: 0,
      ready: 0,
      needsReview: 0,
    };

    for (const input of payload.records) {
      this.assertDirectionAllowed(source.direction, input.direction);
      const outcome = await this.prisma.$transaction(async (tx) =>
        this.ingestOne(tx, source, input),
      );
      result[outcome.recordCreated ? 'created' : 'updated'] += 1;
      result[
        outcome.evidenceCreated ? 'evidenceCreated' : 'evidenceUpdated'
      ] += 1;
      result[outcome.ingestionStatus === 'ready' ? 'ready' : 'needsReview'] +=
        1;
    }

    return result;
  }

  async listRecords(params: {
    entityId: string;
    direction?: string;
    status?: string;
    limit?: number;
  }) {
    const limit = Math.max(1, Math.min(params.limit || 100, 500));
    return this.prisma.externalInvoiceRecord.findMany({
      where: {
        entityId: params.entityId.trim(),
        ...(params.direction ? { direction: params.direction } : {}),
        ...(params.status ? { ingestionStatus: params.status } : {}),
      },
      include: {
        _count: { select: { evidences: true } },
        evidences: {
          select: {
            sourceId: true,
            externalRecordId: true,
            evidenceHash: true,
            sourceUpdatedAt: true,
            firstSeenAt: true,
            lastSeenAt: true,
          },
          orderBy: { firstSeenAt: 'asc' },
        },
      },
      orderBy: [{ invoiceDate: 'desc' }, { lastSeenAt: 'desc' }],
      take: limit,
    });
  }

  private async ingestOne(
    tx: Prisma.TransactionClient,
    source: {
      id: string;
      entityId: string;
      connector: string;
      direction: string;
      entity: { taxId: string | null };
    },
    input: InvoiceSourceRecordDto,
  ) {
    const normalized = this.normalizeRecord(source, input);
    const existingEvidence = await tx.invoiceSourceEvidence.findUnique({
      where: {
        sourceId_externalRecordId: {
          sourceId: source.id,
          externalRecordId: normalized.externalRecordId,
        },
      },
      include: { record: true },
    });
    const existingRecord = await tx.externalInvoiceRecord.findUnique({
      where: {
        entityId_direction_canonicalKey: {
          entityId: source.entityId,
          direction: normalized.direction,
          canonicalKey: normalized.canonicalKey,
        },
      },
    });
    const pinnedEvidenceRecord =
      existingEvidence &&
      (Boolean(existingEvidence.record.matchedId) ||
        TERMINAL_INGESTION_STATUSES.has(
          existingEvidence.record.ingestionStatus,
        ))
        ? existingEvidence.record
        : null;
    const effectiveExistingRecord = pinnedEvidenceRecord || existingRecord;

    const ingestionStatus =
      effectiveExistingRecord &&
      TERMINAL_INGESTION_STATUSES.has(
        effectiveExistingRecord.ingestionStatus,
      )
        ? effectiveExistingRecord.ingestionStatus
        : normalized.ingestionStatus;

    const record = effectiveExistingRecord
      ? await tx.externalInvoiceRecord.update({
          where: { id: effectiveExistingRecord.id },
          data: {
            invoiceNumber:
              normalized.invoiceNumber || effectiveExistingRecord.invoiceNumber,
            invoiceDate:
              normalized.invoiceDate || effectiveExistingRecord.invoiceDate,
            sellerTaxId:
              normalized.sellerTaxId || effectiveExistingRecord.sellerTaxId,
            buyerTaxId:
              normalized.buyerTaxId || effectiveExistingRecord.buyerTaxId,
            amountNet:
              normalized.amountNet ?? effectiveExistingRecord.amountNet,
            amountTax:
              normalized.amountTax ?? effectiveExistingRecord.amountTax,
            amountGross:
              normalized.amountGross ?? effectiveExistingRecord.amountGross,
            amountCurrency:
              normalized.amountCurrency ||
              effectiveExistingRecord.amountCurrency,
            sourceStatus:
              normalized.sourceStatus || effectiveExistingRecord.sourceStatus,
            ingestionStatus,
            reviewReason:
              ingestionStatus === normalized.ingestionStatus
                ? normalized.reviewReason
                : effectiveExistingRecord.reviewReason,
            lastSeenAt: new Date(),
          },
        })
      : await tx.externalInvoiceRecord.create({
          data: {
            entityId: source.entityId,
            direction: normalized.direction,
            documentType: normalized.documentType,
            canonicalKey: normalized.canonicalKey,
            invoiceNumber: normalized.invoiceNumber,
            invoiceDate: normalized.invoiceDate,
            sellerTaxId: normalized.sellerTaxId,
            buyerTaxId: normalized.buyerTaxId,
            amountNet: normalized.amountNet,
            amountTax: normalized.amountTax,
            amountGross: normalized.amountGross,
            amountCurrency: normalized.amountCurrency,
            sourceStatus: normalized.sourceStatus,
            ingestionStatus,
            reviewReason: normalized.reviewReason,
          },
        });

    const evidenceData = {
      recordId: record.id,
      evidenceHash: normalized.evidenceHash,
      sourceUpdatedAt: normalized.sourceUpdatedAt,
      rawMetadata: normalized.rawMetadata,
      lastSeenAt: new Date(),
    };
    if (existingEvidence) {
      await tx.invoiceSourceEvidence.update({
        where: { id: existingEvidence.id },
        data: evidenceData,
      });
      if (
        existingEvidence.recordId !== record.id &&
        !existingEvidence.record.matchedId
      ) {
        const remaining = await tx.invoiceSourceEvidence.count({
          where: { recordId: existingEvidence.recordId },
        });
        if (remaining === 0) {
          await tx.externalInvoiceRecord.delete({
            where: { id: existingEvidence.recordId },
          });
        }
      }
    } else {
      await tx.invoiceSourceEvidence.create({
        data: {
          sourceId: source.id,
          externalRecordId: normalized.externalRecordId,
          ...evidenceData,
        },
      });
    }

    return {
      recordCreated: !effectiveExistingRecord,
      evidenceCreated: !existingEvidence,
      ingestionStatus,
    };
  }

  private normalizeRecord(
    source: {
      id: string;
      entityId: string;
      connector: string;
      entity: { taxId: string | null };
    },
    input: InvoiceSourceRecordDto,
  ) {
    const externalRecordId = input.externalRecordId.trim();
    if (!externalRecordId) {
      throw new BadRequestException('externalRecordId is required');
    }

    const documentType = input.documentType || InvoiceDocumentType.INVOICE;
    const invoiceNumber = this.normalizeInvoiceNumber(input.invoiceNumber);
    const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : null;
    const sellerTaxId = this.normalizeTaxId(input.sellerTaxId);
    const buyerTaxId = this.normalizeTaxId(input.buyerTaxId);
    const entityTaxId = this.normalizeTaxId(source.entity.taxId);
    const amountNet = this.toDecimal(input.amountNet);
    const amountTax = this.toDecimal(input.amountTax);
    const amountGross = this.toDecimal(input.amountGross);
    const amountCurrency = (input.amountCurrency || 'TWD').trim().toUpperCase();
    const evidenceHash = input.evidenceHash?.trim().toLowerCase() || null;
    const reviewReasons: string[] = [];

    if (!invoiceNumber) reviewReasons.push('invoice_number_missing');
    if (!invoiceDate) reviewReasons.push('invoice_date_missing');
    if (amountGross === null) reviewReasons.push('gross_amount_missing');
    if (input.direction === InvoiceDirection.INCOMING) {
      if (!sellerTaxId) reviewReasons.push('seller_tax_id_missing');
      if (!entityTaxId) reviewReasons.push('entity_tax_id_missing');
      if (!buyerTaxId) reviewReasons.push('buyer_tax_id_missing');
      if (entityTaxId && buyerTaxId && entityTaxId !== buyerTaxId) {
        reviewReasons.push('buyer_tax_id_mismatch');
      }
    } else if (
      entityTaxId &&
      sellerTaxId &&
      entityTaxId !== sellerTaxId
    ) {
      reviewReasons.push('seller_tax_id_mismatch');
    }
    if (
      amountNet !== null &&
      amountTax !== null &&
      amountGross !== null &&
      amountNet.plus(amountTax).minus(amountGross).abs().greaterThan(0.01)
    ) {
      reviewReasons.push('amounts_do_not_balance');
    }

    return {
      externalRecordId,
      direction: input.direction,
      documentType,
      canonicalKey: this.buildCanonicalKey({
        sourceId: source.id,
        externalRecordId,
        direction: input.direction,
        documentType,
        invoiceNumber,
        invoiceDate,
        sellerTaxId,
        buyerTaxId,
        evidenceHash,
      }),
      invoiceNumber,
      invoiceDate,
      sellerTaxId,
      buyerTaxId,
      amountNet,
      amountTax,
      amountGross,
      amountCurrency,
      sourceStatus: input.sourceStatus?.trim() || null,
      evidenceHash,
      sourceUpdatedAt: input.sourceUpdatedAt
        ? new Date(input.sourceUpdatedAt)
        : null,
      rawMetadata: this.sanitizeMetadata(input.rawMetadata),
      ingestionStatus: reviewReasons.length ? 'needs_review' : 'ready',
      reviewReason: reviewReasons.join(',') || null,
    };
  }

  private buildCanonicalKey(input: {
    sourceId: string;
    externalRecordId: string;
    direction: string;
    documentType: string;
    invoiceNumber: string | null;
    invoiceDate: Date | null;
    sellerTaxId: string | null;
    buyerTaxId: string | null;
    evidenceHash: string | null;
  }) {
    const identity =
      input.invoiceNumber && input.invoiceDate
        ? [
            'invoice-v1',
            input.direction,
            input.documentType,
            input.sellerTaxId || '-',
            input.buyerTaxId || '-',
            input.invoiceNumber,
            input.invoiceDate.toISOString().slice(0, 10),
          ].join('|')
        : input.evidenceHash
          ? `evidence-v1|${input.direction}|${input.evidenceHash}`
          : `source-v1|${input.sourceId}|${input.externalRecordId}`;

    return createHash('sha256').update(identity).digest('hex');
  }

  private sanitizeMetadata(value?: Record<string, unknown>) {
    if (!value) return undefined;

    const sanitize = (input: unknown, depth: number): unknown => {
      if (depth > 5) return '[truncated]';
      if (Array.isArray(input)) {
        return input.slice(0, 50).map((item) => sanitize(item, depth + 1));
      }
      if (input && typeof input === 'object') {
        return Object.fromEntries(
          Object.entries(input as Record<string, unknown>)
            .filter(([key]) => !SECRET_METADATA_KEYS.test(key))
            .slice(0, 100)
            .map(([key, item]) => [key, sanitize(item, depth + 1)]),
        );
      }
      if (typeof input === 'string') return input.slice(0, 2000);
      return input;
    };

    const sanitized = sanitize(value, 0) as Prisma.InputJsonValue;
    if (JSON.stringify(sanitized).length > 64 * 1024) {
      throw new BadRequestException('rawMetadata exceeds 64 KB');
    }
    return sanitized;
  }

  private normalizeSourceKey(connector: string, sourceKey: string) {
    const normalized = sourceKey.trim();
    if (!normalized) throw new BadRequestException('sourceKey is required');
    return connector === InvoiceSourceConnector.GMAIL
      ? normalized.toLowerCase()
      : normalized;
  }

  private normalizeInvoiceNumber(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, '').toUpperCase();
    return normalized || null;
  }

  private normalizeTaxId(value?: string | null) {
    const normalized = value?.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return normalized || null;
  }

  private toDecimal(value?: number) {
    return value === undefined || value === null
      ? null
      : new Prisma.Decimal(value).toDecimalPlaces(2);
  }

  private assertDirectionAllowed(sourceDirection: string, recordDirection: string) {
    if (
      sourceDirection !== InvoiceDirection.BOTH &&
      sourceDirection !== recordDirection
    ) {
      throw new BadRequestException(
        `Source direction ${sourceDirection} cannot ingest ${recordDirection} records`,
      );
    }
  }

  private async assertEntityExists(entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('Company entity not found');
  }

  private toSafeSource(source: {
    id: string;
    entityId: string;
    connector: string;
    sourceKey: string;
    direction: string;
    displayName: string | null;
    status: string;
    syncMode: string;
    credentialRef: string | null;
    lastSyncAt: Date | null;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: source.id,
      entityId: source.entityId,
      connector: source.connector,
      sourceKey: source.sourceKey,
      direction: source.direction,
      displayName: source.displayName,
      status: source.status,
      syncMode: source.syncMode,
      credentialConfigured: Boolean(source.credentialRef),
      lastSyncAt: source.lastSyncAt,
      lastSuccessAt: source.lastSuccessAt,
      lastFailureAt: source.lastFailureAt,
      lastError: source.lastError,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}
