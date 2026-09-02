import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

export type ExternalInvoiceStatus = 'draft' | 'issued' | 'void';

type ExternalInvoiceOrder = {
  id: string;
  entityId: string;
  totalGrossOriginal: Decimal;
  totalGrossCurrency: string;
  totalGrossFxRate: Decimal;
  customer?: {
    name?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    taxId?: string | null;
    address?: string | null;
  } | null;
};

type ExternalInvoiceInput = {
  invoiceNumber: string;
  status: ExternalInvoiceStatus;
  issuedAt?: Date | null;
  voidAt?: Date | null;
  externalPlatform?: string | null;
  externalPayload?: unknown;
  notes?: string | null;
};

@Injectable()
export class ExternalInvoiceIngestionService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(order: ExternalInvoiceOrder, input: ExternalInvoiceInput) {
    const invoiceNumber = input.invoiceNumber.trim().toUpperCase();
    if (!/^[A-Z]{2}[0-9]{8}$/.test(invoiceNumber)) {
      throw new BadRequestException(
        `Invalid external invoice number for order ${order.id}`,
      );
    }

    const existing = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
    });
    if (
      existing &&
      (existing.entityId !== order.entityId ||
        (existing.orderId && existing.orderId !== order.id))
    ) {
      throw new BadRequestException(
        `Invoice ${invoiceNumber} is already linked to another order or entity`,
      );
    }

    const requestedStatus = input.status;
    const status = this.resolveStatusTransition(
      existing?.status || null,
      requestedStatus,
    );
    const amounts = this.buildAmounts(order);
    const commonData = {
      orderId: order.id,
      status,
      issuedAt: input.issuedAt || existing?.issuedAt || null,
      voidAt:
        status === 'void'
          ? input.voidAt || existing?.voidAt || new Date()
          : existing?.voidAt || null,
      externalInvoiceId: invoiceNumber,
      externalPlatform: input.externalPlatform || null,
      externalPayload: (input.externalPayload as any) || undefined,
      notes: input.notes || null,
    };

    const invoice = existing
      ? await this.prisma.invoice.update({
          where: { id: existing.id },
          data: commonData,
        })
      : await this.prisma.invoice.create({
          data: {
            entityId: order.entityId,
            invoiceNumber,
            invoiceType: order.customer?.taxId ? 'B2B' : 'B2C',
            buyerName:
              order.customer?.companyName || order.customer?.name || null,
            buyerTaxId: order.customer?.taxId || null,
            buyerEmail: order.customer?.email || null,
            buyerPhone: order.customer?.phone || null,
            buyerAddress: order.customer?.address || null,
            ...amounts,
            ...commonData,
          },
        });

    const currentIssuedInvoice =
      status === 'issued'
        ? invoice
        : await this.prisma.invoice.findFirst({
            where: {
              entityId: order.entityId,
              orderId: order.id,
              status: { equals: 'issued', mode: 'insensitive' },
            },
            orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
          });

    await this.prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        hasInvoice: Boolean(currentIssuedInvoice),
        invoiceId: currentIssuedInvoice?.id || invoice.id,
      },
    });

    return invoice;
  }

  private resolveStatusTransition(
    existingStatus: string | null,
    requestedStatus: ExternalInvoiceStatus,
  ): ExternalInvoiceStatus {
    const normalizedExisting = existingStatus?.trim().toLowerCase();
    if (normalizedExisting === 'void') {
      return 'void';
    }
    if (normalizedExisting === 'issued' && requestedStatus === 'draft') {
      return 'issued';
    }
    return requestedStatus;
  }

  private buildAmounts(order: ExternalInvoiceOrder) {
    const taxRate = new Decimal(0.05);
    const fxRate = new Decimal(order.totalGrossFxRate || 1);
    const totalAmountOriginal = new Decimal(
      order.totalGrossOriginal || 0,
    ).toDecimalPlaces(2);
    const amountOriginal = totalAmountOriginal
      .div(new Decimal(1).plus(taxRate))
      .toDecimalPlaces(2);
    const taxAmountOriginal = totalAmountOriginal
      .sub(amountOriginal)
      .toDecimalPlaces(2);
    const amountBase = amountOriginal.mul(fxRate).toDecimalPlaces(2);
    const taxAmountBase = taxAmountOriginal.mul(fxRate).toDecimalPlaces(2);
    const totalAmountBase = totalAmountOriginal.mul(fxRate).toDecimalPlaces(2);
    const currency = order.totalGrossCurrency || 'TWD';

    return {
      amountOriginal,
      currency,
      fxRate,
      amountBase,
      taxAmountOriginal,
      taxAmountCurrency: currency,
      taxAmountFxRate: fxRate,
      taxAmountBase,
      totalAmountOriginal,
      totalAmountCurrency: currency,
      totalAmountFxRate: fxRate,
      totalAmountBase,
    };
  }
}
