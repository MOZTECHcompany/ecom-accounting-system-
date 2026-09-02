import { createHash } from 'node:crypto';
import {
  isAfterSalesCaseStatus,
  isAfterSalesCaseType,
} from './after-sales-workflow.contract';

type JsonRecord = Record<string, unknown>;

export type AfterSalesMigrationIssueCode =
  | 'invalid_payload'
  | 'missing_required_field'
  | 'invalid_date'
  | 'unknown_case_type'
  | 'unknown_case_status'
  | 'invalid_quantity'
  | 'invalid_amount'
  | 'product_mapping_required'
  | 'duplicate_source_record';

export type AfterSalesMigrationIssue = {
  code: AfterSalesMigrationIssueCode;
  field?: string;
  count?: number;
};

export type AfterSalesMigrationCandidateAudit = {
  decision: 'candidate' | 'needs_review' | 'deleted';
  sourceRecordId: string | null;
  caseNumber: string | null;
  caseType: string | null;
  caseStatus: string | null;
  sourceUpdatedAt: string | null;
  sourceDeletedAt: string | null;
  checksum: string;
  issues: AfterSalesMigrationIssue[];
  unmappedItems: number;
  childCounts: Record<string, number>;
};

const CHILD_COLLECTIONS = [
  'items',
  'shipments',
  'reverseShipments',
  'paymentRecords',
  'paymentRequests',
  'paymentSubmissions',
  'refundRecords',
  'invoiceRecords',
  'attachments',
  'timeline',
  'auditLog',
  'notes',
] as const;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function readString(record: JsonRecord, field: string) {
  const value = record[field];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isValidDate(value: string | null) {
  return value !== null && !Number.isNaN(new Date(value).getTime());
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  const record = asRecord(value);
  if (!record) return value;

  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  );
}

export function checksumAfterSalesPayload(payload: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(payload)), 'utf8')
    .digest('hex');
}

function arrayField(record: JsonRecord, field: string) {
  const value = record[field];
  return Array.isArray(value) ? (value as unknown[]) : [];
}

function countInvalidNumbers(
  values: unknown[],
  field: string,
  options: { positive?: boolean } = {},
) {
  return values.filter((value) => {
    const record = asRecord(value);
    if (!record || record[field] === null || record[field] === undefined) {
      return false;
    }
    const parsed = Number(record[field]);
    if (!Number.isFinite(parsed)) return true;
    return options.positive ? parsed <= 0 : parsed < 0;
  }).length;
}

export function auditAfterSalesMigrationCandidate(
  payload: unknown,
): AfterSalesMigrationCandidateAudit {
  const checksum = checksumAfterSalesPayload(payload);
  const record = asRecord(payload);

  if (!record) {
    return {
      decision: 'needs_review',
      sourceRecordId: null,
      caseNumber: null,
      caseType: null,
      caseStatus: null,
      sourceUpdatedAt: null,
      sourceDeletedAt: null,
      checksum,
      issues: [{ code: 'invalid_payload' }],
      unmappedItems: 0,
      childCounts: {},
    };
  }

  const sourceRecordId = readString(record, 'id');
  const caseNumber = readString(record, 'caseNumber');
  const caseType = readString(record, 'type');
  const caseStatus = readString(record, 'status');
  const sourceUpdatedAt = readString(record, 'updatedAt');
  const sourceDeletedAt = readString(record, 'deletedAt');
  const issues: AfterSalesMigrationIssue[] = [];

  for (const field of [
    'id',
    'caseNumber',
    'type',
    'status',
    'sourceChannel',
    'contactName',
    'registeredAt',
    'updatedAt',
  ]) {
    if (!readString(record, field)) {
      issues.push({ code: 'missing_required_field', field });
    }
  }

  for (const field of ['registeredAt', 'updatedAt']) {
    const value = readString(record, field);
    if (value && !isValidDate(value)) {
      issues.push({ code: 'invalid_date', field });
    }
  }

  if (sourceDeletedAt && !isValidDate(sourceDeletedAt)) {
    issues.push({ code: 'invalid_date', field: 'deletedAt' });
  }

  if (caseType && !isAfterSalesCaseType(caseType)) {
    issues.push({ code: 'unknown_case_type', field: 'type' });
  }

  if (caseStatus && !isAfterSalesCaseStatus(caseStatus)) {
    issues.push({ code: 'unknown_case_status', field: 'status' });
  }

  const items = arrayField(record, 'items');
  const unmappedItems = items.filter((item) => {
    const itemRecord = asRecord(item);
    return itemRecord && !readString(itemRecord, 'productId');
  }).length;
  if (unmappedItems > 0) {
    issues.push({
      code: 'product_mapping_required',
      field: 'items.productId',
      count: unmappedItems,
    });
  }

  const invalidQuantities = countInvalidNumbers(items, 'quantity', {
    positive: true,
  });
  if (invalidQuantities > 0) {
    issues.push({
      code: 'invalid_quantity',
      field: 'items.quantity',
      count: invalidQuantities,
    });
  }

  const monetaryFields: Array<[collection: string, field: string]> = [
    ['items', 'unitPrice'],
    ['paymentRecords', 'amount'],
    ['paymentSubmissions', 'remittanceAmount'],
    ['refundRecords', 'amount'],
  ];
  for (const [collection, field] of monetaryFields) {
    const invalidAmounts = countInvalidNumbers(
      arrayField(record, collection),
      field,
    );
    if (invalidAmounts > 0) {
      issues.push({
        code: 'invalid_amount',
        field: `${collection}.${field}`,
        count: invalidAmounts,
      });
    }
  }

  const childCounts = Object.fromEntries(
    CHILD_COLLECTIONS.map((field) => [field, arrayField(record, field).length]),
  );

  return {
    decision: sourceDeletedAt
      ? 'deleted'
      : issues.length > 0
        ? 'needs_review'
        : 'candidate',
    sourceRecordId,
    caseNumber,
    caseType,
    caseStatus,
    sourceUpdatedAt,
    sourceDeletedAt,
    checksum,
    issues,
    unmappedItems,
    childCounts,
  };
}

export function auditAfterSalesMigrationBatch(payloads: unknown[]) {
  const items = payloads.map(auditAfterSalesMigrationCandidate);
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.sourceRecordId) continue;
    counts.set(item.sourceRecordId, (counts.get(item.sourceRecordId) ?? 0) + 1);
  }

  for (const item of items) {
    if (!item.sourceRecordId || counts.get(item.sourceRecordId) === 1) continue;
    item.decision = 'needs_review';
    item.issues.push({
      code: 'duplicate_source_record',
      field: 'id',
      count: counts.get(item.sourceRecordId),
    });
  }

  return {
    status: items.some((item) => item.decision === 'needs_review')
      ? ('needs_review' as const)
      : ('ready' as const),
    summary: {
      total: items.length,
      candidate: items.filter((item) => item.decision === 'candidate').length,
      needsReview: items.filter((item) => item.decision === 'needs_review')
        .length,
      deleted: items.filter((item) => item.decision === 'deleted').length,
      unmappedItems: items.reduce((sum, item) => sum + item.unmappedItems, 0),
    },
    items,
  };
}
