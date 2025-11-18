import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * InvoicingService
 *
 * 電子發票服務（實戰版）
 *
 * 功能：
 * 1. 從訂單預覽發票內容
 * 2. 開立正式發票並寫入資料庫
 * 3. 發票作廢
 * 4. 開立折讓單
 * 5. 查詢發票狀態
 */
@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 預覽某訂單的發票內容
   *
   * @param orderId - 訂單ID
   * @returns 發票預覽資料
   */
  async previewInvoice(orderId: string) {
    this.logger.log(`預覽發票 - 訂單ID: ${orderId}`);

    // 查詢訂單及明細
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`訂單不存在: ${orderId}`);
    }

    // 計算未稅金額（假設含稅總額，稅率 5%）
    const taxRate = new Decimal(0.05);
    const totalAmountOriginal = new Decimal(order.totalGrossOriginal);
    const amountOriginal = totalAmountOriginal.div(new Decimal(1).plus(taxRate));
    const taxAmountOriginal = totalAmountOriginal.minus(amountOriginal);

    // 本位幣換算
    const fxRate = new Decimal(order.totalGrossFxRate);
    const amountBase = amountOriginal.mul(fxRate);
    const taxAmountBase = taxAmountOriginal.mul(fxRate);
    const totalAmountBase = amountBase.plus(taxAmountBase);

    // 建立發票明細
    const invoiceLines = order.items.map((item) => {
      const itemAmountOriginal = new Decimal(item.unitPriceOriginal).mul(
        new Decimal(item.qty),
      );
      const itemTaxAmountOriginal = itemAmountOriginal.mul(taxRate);
      const itemAmountBase = itemAmountOriginal.mul(new Decimal(item.unitPriceFxRate));
      const itemTaxAmountBase = itemTaxAmountOriginal.mul(new Decimal(item.unitPriceFxRate));

      return {
        productId: item.productId,
        description: item.product?.name || '商品',
        qty: item.qty.toNumber(),
        unitPriceOriginal: new Decimal(item.unitPriceOriginal).toNumber(),
        currency: item.unitPriceCurrency,
        amountOriginal: itemAmountOriginal.toFixed(2),
        taxAmountOriginal: itemTaxAmountOriginal.toFixed(2),
      };
    });

    return {
      orderId: order.id,
      invoiceType: 'B2C',
      buyerName: order.customer?.name || '散客',
      buyerTaxId: null,
      currency: order.totalGrossCurrency,
      fxRate: fxRate.toNumber(),
      amountOriginal: amountOriginal.toFixed(2),
      taxAmountOriginal: taxAmountOriginal.toFixed(2),
      totalAmountOriginal: totalAmountOriginal.toFixed(2),
      amountBase: amountBase.toFixed(2),
      taxAmountBase: taxAmountBase.toFixed(2),
      totalAmountBase: totalAmountBase.toFixed(2),
      invoiceLines,
      estimatedInvoiceNumber: this.generateInvoiceNumber(),
      warnings:
        order.hasInvoice
          ? ['此訂單已開立過發票']
          : [],
    };
  }

  /**
   * 開立正式發票
   *
   * @param orderId - 訂單ID
   * @param dto - 開立發票DTO
   * @param userId - 操作人員ID
   * @returns 發票資料
   */
  async issueInvoice(orderId: string, dto: IssueInvoiceDto, userId: string) {
    this.logger.log(`開立發票 - 訂單ID: ${orderId}, 操作人員: ${userId}`);

    // 1. 查詢訂單
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`訂單不存在: ${orderId}`);
    }

    if (order.hasInvoice) {
      throw new ConflictException(`訂單已開立發票，不可重複開立`);
    }

    // 2. 計算發票金額
    const taxRate = new Decimal(0.05);
    const totalAmountOriginal = new Decimal(order.totalGrossOriginal);
    const amountOriginal = totalAmountOriginal.div(new Decimal(1).plus(taxRate));
    const taxAmountOriginal = totalAmountOriginal.minus(amountOriginal);
    const fxRate = new Decimal(order.totalGrossFxRate);
    const currency = order.totalGrossCurrency;

    const amountBase = amountOriginal.mul(fxRate);
    const taxAmountBase = taxAmountOriginal.mul(fxRate);
    const totalAmountBase = totalAmountOriginal.mul(fxRate);

    // 3. 產生發票號碼
    const invoiceNumber = this.generateInvoiceNumber();

    // 4. 使用 Transaction 寫入發票資料
    const invoice = await this.prisma.$transaction(async (tx) => {
      // 建立發票主表
      const newInvoice = await tx.invoice.create({
        data: {
          entityId: order.entityId,
          orderId: order.id,
          invoiceNumber,
          status: 'issued',
          invoiceType: dto.invoiceType || 'B2C',
          issuedAt: new Date(),
          buyerName: dto.buyerName || null,
          buyerTaxId: dto.buyerTaxId || null,
          buyerEmail: dto.buyerEmail || null,
          buyerPhone: dto.buyerPhone || null,
          buyerAddress: dto.buyerAddress || null,
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
          externalInvoiceId: null, // TODO: 外部平台串接
          externalPlatform: null,
          externalPayload: null,
          notes: dto.notes || null,
        },
      });

      // 建立發票明細
      const invoiceLineData = order.items.map((item) => {
        const itemQty = new Decimal(item.qty);
        const itemUnitPriceOriginal = new Decimal(item.unitPriceOriginal);
        const itemAmountOriginal = itemUnitPriceOriginal.mul(itemQty);
        const itemTaxAmountOriginal = itemAmountOriginal.mul(taxRate);
        const itemFxRate = new Decimal(item.unitPriceFxRate);

        return {
          invoiceId: newInvoice.id,
          productId: item.productId,
          description: item.product?.name || '商品',
          qty: itemQty,
          unitPriceOriginal: itemUnitPriceOriginal,
          unitPriceCurrency: item.unitPriceCurrency,
          unitPriceFxRate: itemFxRate,
          unitPriceBase: itemUnitPriceOriginal.mul(itemFxRate),
          amountOriginal: itemAmountOriginal,
          currency: item.unitPriceCurrency,
          fxRate: itemFxRate,
          amountBase: itemAmountOriginal.mul(itemFxRate),
          taxAmountOriginal: itemTaxAmountOriginal,
          taxAmountCurrency: item.unitPriceCurrency,
          taxAmountFxRate: itemFxRate,
          taxAmountBase: itemTaxAmountOriginal.mul(itemFxRate),
        };
      });

      await tx.invoiceLine.createMany({
        data: invoiceLineData,
      });

      // 記錄發票操作日誌
      await tx.invoiceLog.create({
        data: {
          invoiceId: newInvoice.id,
          action: 'issue',
          userId,
          payload: {
            dto,
            invoiceNumber,
            orderId,
          },
        },
      });

      // 更新訂單狀態
      await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          hasInvoice: true,
          invoiceId: newInvoice.id,
        },
      });

      return newInvoice;
    });

    this.logger.log(`發票開立成功: ${invoice.invoiceNumber}`);

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: totalAmountOriginal.toFixed(2),
      currency,
    };
  }

  /**
   * 作廢發票
   *
   * @param invoiceId - 發票ID
   * @param reason - 作廢原因
   * @param userId - 操作人員ID
   */
  async voidInvoice(invoiceId: string, reason: string, userId: string) {
    this.logger.log(`作廢發票 - 發票ID: ${invoiceId}, 操作人員: ${userId}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`發票不存在: ${invoiceId}`);
    }

    if (invoice.status === 'void') {
      throw new BadRequestException(`發票已作廢，不可重複作廢`);
    }

    if (invoice.status !== 'issued') {
      throw new BadRequestException(`只能作廢已開立的發票`);
    }

    await this.prisma.$transaction(async (tx) => {
      // 更新發票狀態
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'void',
          voidAt: new Date(),
          voidReason: reason,
        },
      });

      // 記錄操作日誌
      await tx.invoiceLog.create({
        data: {
          invoiceId,
          action: 'void',
          userId,
          payload: { reason },
        },
      });

      // 取消訂單的發票標記
      if (invoice.orderId) {
        await tx.salesOrder.update({
          where: { id: invoice.orderId },
          data: {
            hasInvoice: false,
            invoiceId: null,
          },
        });
      }
    });

    this.logger.log(`發票作廢成功: ${invoice.invoiceNumber}`);

    return {
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      voidAt: new Date(),
    };
  }

  /**
   * 開立折讓單
   *
   * @param invoiceId - 原發票ID
   * @param allowanceAmount - 折讓金額
   * @param reason - 折讓原因
   * @param userId - 操作人員ID
   */
  async createAllowance(
    invoiceId: string,
    allowanceAmount: number,
    reason: string,
    userId: string,
  ) {
    this.logger.log(`開立折讓單 - 發票ID: ${invoiceId}, 操作人員: ${userId}`);

    const originalInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!originalInvoice) {
      throw new NotFoundException(`發票不存在: ${invoiceId}`);
    }

    if (originalInvoice.status !== 'issued') {
      throw new BadRequestException(`只能對已開立的發票開立折讓單`);
    }

    const allowanceAmountDecimal = new Decimal(allowanceAmount);
    if (allowanceAmountDecimal.lte(0)) {
      throw new BadRequestException(`折讓金額必須大於 0`);
    }

    if (allowanceAmountDecimal.gte(new Decimal(originalInvoice.totalAmountOriginal))) {
      throw new BadRequestException(`折讓金額不能大於原發票金額`);
    }

    // 建立負項發票（折讓單）
    const allowanceInvoiceNumber = `${originalInvoice.invoiceNumber}-AL-${Date.now().toString().slice(-6)}`;

    const allowanceInvoice = await this.prisma.$transaction(async (tx) => {
      const newAllowance = await tx.invoice.create({
        data: {
          entityId: originalInvoice.entityId,
          orderId: originalInvoice.orderId,
          invoiceNumber: allowanceInvoiceNumber,
          status: 'issued',
          invoiceType: originalInvoice.invoiceType,
          issuedAt: new Date(),
          buyerName: originalInvoice.buyerName,
          buyerTaxId: originalInvoice.buyerTaxId,
          buyerEmail: originalInvoice.buyerEmail,
          amountOriginal: allowanceAmountDecimal.neg(),
          currency: originalInvoice.currency,
          fxRate: originalInvoice.fxRate,
          amountBase: allowanceAmountDecimal.mul(new Decimal(originalInvoice.fxRate)).neg(),
          taxAmountOriginal: new Decimal(0),
          taxAmountCurrency: originalInvoice.currency,
          taxAmountFxRate: originalInvoice.fxRate,
          taxAmountBase: new Decimal(0),
          totalAmountOriginal: allowanceAmountDecimal.neg(),
          totalAmountCurrency: originalInvoice.currency,
          totalAmountFxRate: originalInvoice.fxRate,
          totalAmountBase: allowanceAmountDecimal.mul(new Decimal(originalInvoice.fxRate)).neg(),
          notes: `折讓單：${reason}`,
        },
      });

      // 記錄操作日誌
      await tx.invoiceLog.create({
        data: {
          invoiceId: originalInvoice.id,
          action: 'allowance',
          userId,
          payload: {
            allowanceInvoiceId: newAllowance.id,
            allowanceInvoiceNumber: newAllowance.invoiceNumber,
            allowanceAmount,
            reason,
          },
        },
      });

      return newAllowance;
    });

    this.logger.log(`折讓單開立成功: ${allowanceInvoice.invoiceNumber}`);

    return {
      success: true,
      allowanceInvoiceNumber: allowanceInvoice.invoiceNumber,
      allowanceAmount,
      originalInvoiceNumber: originalInvoice.invoiceNumber,
    };
  }

  /**
   * 查詢訂單的發票狀態
   *
   * @param orderId - 訂單ID
   * @returns 發票資料
   */
  async getInvoiceByOrderId(orderId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { orderId },
      include: {
        invoiceLines: {
          include: {
            product: true,
          },
        },
        invoiceLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invoices;
  }

  /**
   * 產生發票號碼（簡化版）
   * TODO: 實作完整的發票字軌管理
   */
  private generateInvoiceNumber(): string {
    const prefix = 'AA'; // 字軌（每兩個月更換）
    const sequence = Math.floor(Math.random() * 90000000) + 10000000; // 8位數流水號
    return `${prefix}${sequence}`;
  }
}
