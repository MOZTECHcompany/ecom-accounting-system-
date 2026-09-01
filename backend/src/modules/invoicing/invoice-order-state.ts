import { Prisma } from '@prisma/client';
import { canonicalSalesOrderWhere } from '../integration/sales-order-integrity';

export function missingIssuedInvoiceWhere(): Prisma.SalesOrderWhereInput {
  return {
    invoices: {
      none: {
        status: {
          equals: 'issued',
          mode: 'insensitive',
        },
      },
    },
  };
}

export function buildInvoiceOrderStateWhere(
  entityId: string,
  orderDate?: Prisma.DateTimeFilter,
) {
  const base: Prisma.SalesOrderWhereInput = canonicalSalesOrderWhere({
    entityId,
    status: { notIn: ['cancelled', 'refunded'] },
    ...(orderDate ? { orderDate } : {}),
  });
  const missingIssuedInvoice = missingIssuedInvoiceWhere();
  const hasIssuedInvoice: Prisma.SalesOrderWhereInput = {
    NOT: missingIssuedInvoice,
  };
  const hasReceivedPayment: Prisma.SalesOrderWhereInput = {
    payments: {
      some: {
        status: {
          in: ['completed', 'success'],
          mode: 'insensitive',
        },
      },
    },
  };

  return {
    completed: {
      AND: [base, hasIssuedInvoice],
    } satisfies Prisma.SalesOrderWhereInput,
    eligible: {
      AND: [base, missingIssuedInvoice, hasReceivedPayment],
    } satisfies Prisma.SalesOrderWhereInput,
    waitingPayment: {
      AND: [
        base,
        missingIssuedInvoice,
        { payments: { none: hasReceivedPayment.payments?.some } },
      ],
    } satisfies Prisma.SalesOrderWhereInput,
    missingIssuedInvoice,
  };
}
