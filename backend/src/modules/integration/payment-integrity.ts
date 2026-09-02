import { Decimal } from '@prisma/client/runtime/library';
import { UnifiedTransaction } from './interfaces/sales-channel-adapter.interface';

const RECEIVED_PAYMENT_STATUSES = new Set(['completed', 'success']);

export type ReceivablePaymentRecord = {
  id: string;
  sourceTransactionKey?: string | null;
  payoutBatchId?: string | null;
  channel?: string | null;
  status?: string | null;
  reconciledFlag?: boolean | null;
  createdAt?: Date | string | null;
};

export function buildPaymentSourceTransactionKey(
  channelId: string,
  externalTransactionId: string,
) {
  const normalizedChannelId = channelId.trim();
  const normalizedTransactionId = externalTransactionId.trim();

  if (!normalizedChannelId || !normalizedTransactionId) {
    throw new Error(
      'Payment source transaction key requires channel and transaction IDs.',
    );
  }

  return `${normalizedChannelId}:${normalizedTransactionId}`;
}

export function resolveStoredPaymentStatus(tx: UnifiedTransaction) {
  if (tx.type === 'authorization' || tx.type === 'void') {
    return 'ignored';
  }
  if (tx.status === 'success') {
    return 'completed';
  }
  if (tx.status === 'failed') {
    return 'failed';
  }
  return 'pending';
}

export function resolveStoredGrossAmount(tx: UnifiedTransaction) {
  const amount = new Decimal(tx.amount || 0);
  return tx.type === 'refund' ? amount.abs().negated() : amount;
}

export function resolveStoredNetAmount(tx: UnifiedTransaction) {
  const amount = new Decimal(tx.net || 0);
  return tx.type === 'refund' ? amount.abs().negated() : amount;
}

export function isReceivedPaymentStatus(status?: string | null) {
  return RECEIVED_PAYMENT_STATUSES.has((status || '').trim().toLowerCase());
}

/**
 * Returns the accounting-effective payment rows for a receivable.
 *
 * Provider transaction identity is the primary invariant. payoutBatchId is
 * the historical provider transaction ID for all sales-channel imports, so it
 * remains the canonical bridge between legacy rows and rows written after
 * sourceTransactionKey was introduced. sourceTransactionKey is used when no
 * historical provider ID exists. Pending, failed, ignored, superseded, and
 * duplicate rows remain in the database for audit, but never increase the
 * received amount.
 */
export function selectEffectiveReceivablePayments<
  T extends ReceivablePaymentRecord,
>(payments: T[]) {
  const canonicalByIdentity = new Map<string, T>();

  for (const payment of payments) {
    const identity = payment.payoutBatchId?.trim()
      ? `provider:${payment.channel || 'UNKNOWN'}:${payment.payoutBatchId.trim()}`
      : payment.sourceTransactionKey?.trim()
        ? `source:${payment.sourceTransactionKey.trim()}`
        : `row:${payment.id}`;
    const current = canonicalByIdentity.get(identity);

    if (!current || comparePaymentPriority(payment, current) > 0) {
      canonicalByIdentity.set(identity, payment);
    }
  }

  return [...canonicalByIdentity.values()].filter((payment) =>
    isReceivedPaymentStatus(payment.status),
  );
}

function comparePaymentPriority(
  left: ReceivablePaymentRecord,
  right: ReceivablePaymentRecord,
) {
  const statusDifference =
    paymentStatusPriority(left.status) - paymentStatusPriority(right.status);
  if (statusDifference !== 0) {
    return statusDifference;
  }

  const reconciliationDifference =
    Number(Boolean(left.reconciledFlag)) -
    Number(Boolean(right.reconciledFlag));
  if (reconciliationDifference !== 0) {
    return reconciliationDifference;
  }

  return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
}

function paymentStatusPriority(status?: string | null) {
  const normalized = (status || '').trim().toLowerCase();
  if (RECEIVED_PAYMENT_STATUSES.has(normalized)) return 3;
  if (normalized === 'pending') return 2;
  return 1;
}

function toTimestamp(value?: Date | string | null) {
  if (!value) return 0;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}
