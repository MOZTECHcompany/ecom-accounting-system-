export const AFTER_SALES_CASE_TYPES = [
  'RESHIPMENT',
  'PRIVATE_PURCHASE',
  'REPAIR',
  'EXCHANGE_RETURN',
  'REFUND_PICKUP',
  'CUSTOMER_ISSUE',
] as const;

export type AfterSalesCaseType = (typeof AFTER_SALES_CASE_TYPES)[number];

export const AFTER_SALES_CASE_STATUSES = [
  'DRAFT',
  'NEW',
  'PENDING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'PENDING_SHIPMENT',
  'SHIPPED',
  'DELIVERED',
  'PENDING_REVERSE_SHIPMENT',
  'REVERSE_IN_TRANSIT',
  'RECEIVED',
  'INSPECTING',
  'PENDING_QUOTE_CONFIRMATION',
  'QUOTE_APPROVED',
  'PENDING_REFUND_CONFIRMATION',
  'REFUND_CONFIRMED',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
] as const;

export type AfterSalesCaseStatus = (typeof AFTER_SALES_CASE_STATUSES)[number];

type TransitionMap = Partial<
  Record<AfterSalesCaseStatus, readonly AfterSalesCaseStatus[]>
>;

const PRIVATE_PURCHASE_TRANSITIONS: TransitionMap = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CLOSED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PENDING_SHIPMENT', 'CANCELLED'],
  PENDING_SHIPMENT: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
};

const REPAIR_TRANSITIONS: TransitionMap = {
  DRAFT: ['PENDING_REVERSE_SHIPMENT', 'CANCELLED'],
  PENDING_REVERSE_SHIPMENT: ['REVERSE_IN_TRANSIT', 'CANCELLED'],
  REVERSE_IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['PENDING_QUOTE_CONFIRMATION', 'PENDING_SHIPMENT', 'CANCELLED'],
  INSPECTING: ['PENDING_QUOTE_CONFIRMATION', 'PENDING_SHIPMENT', 'CANCELLED'],
  PENDING_QUOTE_CONFIRMATION: [
    'PENDING_PAYMENT',
    'PENDING_SHIPMENT',
    'RECEIVED',
    'CANCELLED',
  ],
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CLOSED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PENDING_SHIPMENT', 'CANCELLED'],
  PENDING_SHIPMENT: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'DELIVERED'],
  DELIVERED: ['COMPLETED'],
};

const RESHIPMENT_WITH_PAYMENT_TRANSITIONS: TransitionMap = {
  NEW: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PENDING_SHIPMENT', 'CLOSED', 'CANCELLED'],
  PENDING_SHIPMENT: ['SHIPPED', 'CLOSED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['CLOSED'],
};

const RESHIPMENT_WITHOUT_PAYMENT_TRANSITIONS: TransitionMap = {
  NEW: ['PENDING_SHIPMENT', 'CLOSED', 'CANCELLED'],
  PENDING_SHIPMENT: ['SHIPPED', 'CLOSED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['CLOSED'],
};

const EXCHANGE_RETURN_TRANSITIONS: TransitionMap = {
  NEW: ['PENDING_REVERSE_SHIPMENT', 'CANCELLED'],
  PENDING_REVERSE_SHIPMENT: ['REVERSE_IN_TRANSIT', 'CANCELLED'],
  REVERSE_IN_TRANSIT: ['COMPLETED', 'RECEIVED', 'CANCELLED'],
  RECEIVED: ['COMPLETED'],
};

const WRONG_PURCHASE_TRANSITIONS: TransitionMap = {
  NEW: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['COMPLETED', 'PENDING_SHIPMENT', 'CANCELLED'],
  PENDING_SHIPMENT: ['COMPLETED', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
};

const REFUND_PICKUP_TRANSITIONS: TransitionMap = {
  NEW: ['PENDING_REVERSE_SHIPMENT', 'CANCELLED'],
  PENDING_REVERSE_SHIPMENT: ['REVERSE_IN_TRANSIT', 'CANCELLED'],
  REVERSE_IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['PENDING_REFUND_CONFIRMATION'],
  PENDING_REFUND_CONFIRMATION: ['REFUND_CONFIRMED', 'CANCELLED'],
  REFUND_CONFIRMED: ['CLOSED'],
};

const REFUND_RECALL_ONLY_TRANSITIONS: TransitionMap = {
  NEW: ['PENDING_REVERSE_SHIPMENT', 'CANCELLED'],
  PENDING_REVERSE_SHIPMENT: ['REVERSE_IN_TRANSIT', 'CANCELLED'],
  REVERSE_IN_TRANSIT: ['CLOSED', 'CANCELLED'],
};

export const LOCKED_AFTER_SALES_STATUSES = [
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
] as const satisfies readonly AfterSalesCaseStatus[];

export function isAfterSalesCaseType(
  value: string,
): value is AfterSalesCaseType {
  return AFTER_SALES_CASE_TYPES.includes(value as AfterSalesCaseType);
}

export function isAfterSalesCaseStatus(
  value: string,
): value is AfterSalesCaseStatus {
  return AFTER_SALES_CASE_STATUSES.includes(value as AfterSalesCaseStatus);
}

export function getAllowedAfterSalesTransitions(input: {
  type: AfterSalesCaseType;
  status: AfterSalesCaseStatus;
  requiresPayment?: boolean;
  wrongPurchase?: boolean;
  recallOnly?: boolean;
}) {
  let transitions: TransitionMap;

  switch (input.type) {
    case 'PRIVATE_PURCHASE':
      transitions = PRIVATE_PURCHASE_TRANSITIONS;
      break;
    case 'REPAIR':
      transitions = REPAIR_TRANSITIONS;
      break;
    case 'RESHIPMENT':
      transitions = input.requiresPayment
        ? RESHIPMENT_WITH_PAYMENT_TRANSITIONS
        : RESHIPMENT_WITHOUT_PAYMENT_TRANSITIONS;
      break;
    case 'EXCHANGE_RETURN':
      transitions = input.wrongPurchase
        ? WRONG_PURCHASE_TRANSITIONS
        : EXCHANGE_RETURN_TRANSITIONS;
      break;
    case 'REFUND_PICKUP':
      transitions = input.recallOnly
        ? REFUND_RECALL_ONLY_TRANSITIONS
        : REFUND_PICKUP_TRANSITIONS;
      break;
    case 'CUSTOMER_ISSUE':
      return [];
  }

  return [...(transitions[input.status] ?? [])];
}

export function isAllowedAfterSalesTransition(
  input: Parameters<typeof getAllowedAfterSalesTransitions>[0],
  nextStatus: AfterSalesCaseStatus,
) {
  return getAllowedAfterSalesTransitions(input).includes(nextStatus);
}
