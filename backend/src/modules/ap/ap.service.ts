import { Injectable, Logger } from '@nestjs/common';
import { TaxType } from '@prisma/client';
import { ApRepository } from './ap.repository';
import {
  ApPaymentFrequency,
  BatchCreateApInvoicesDto,
} from './dto/batch-create-ap-invoices.dto';
import { UpdateApInvoiceDto } from './dto/update-ap-invoice.dto';

/**
 * 應付帳款服務
 *
 * 核心功能：
 * 1. AP 發票管理
 * 2. 付款記錄
 * 3. 到期應付款報表
 * 4. 付款排程
 */
@Injectable()
export class ApService {
  private readonly logger = new Logger(ApService.name);

  constructor(private readonly apRepository: ApRepository) {}

  async getInvoices(entityId?: string) {
    const [invoices, paymentTasks] = await Promise.all([
      this.apRepository.findInvoices(entityId),
      this.apRepository.findPaymentTasks(entityId),
    ]);

    const mappedInvoices = invoices.map((inv) => ({
      ...inv,
      source: 'ap_invoice',
    }));

    const taskInvoices = paymentTasks.map((task) => ({
      id: task.id,
      entityId: task.entityId,
      invoiceNo:
        task.expenseRequest?.description?.slice(0, 20) ||
        `EXP-${task.expenseRequestId?.slice(0, 8)}`,
      vendorId: task.vendorId || 'EMP-REIMBURSE',
      vendor: task.vendor || {
        id: 'EMP-REIMBURSE',
        name: '員工報銷 / 零用金',
        code: 'EMP',
      },
      amountOriginal: task.amountOriginal,
      amountCurrency: task.amountCurrency,
      paidAmountOriginal: task.paidDate ? task.amountOriginal : 0,
      status: task.status === 'pending' ? 'pending' : 'paid',
      invoiceDate: task.createdAt,
      dueDate: task.dueDate || task.createdAt,
      paymentFrequency: 'one_time',
      notes: task.notes,
      source: 'payment_task',
      taxType: null,
      taxAmount: 0,
    }));

    return [...mappedInvoices, ...taskInvoices].sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );
  }

  /**
   * 建立AP發票
   * TODO: 產生分錄（借：進貨或費用 / 貸：應付帳款）
   */
  async createInvoice(data: any) {
    return this.apRepository.createInvoice(data);
  }

  async batchImportInvoices(payload: BatchCreateApInvoicesDto) {
    const invoices = payload.invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const invoiceDate = new Date(invoice.invoiceDate);
      const isMonthly = invoice.paymentFrequency === ApPaymentFrequency.MONTHLY;

      const taxType = invoice.taxType ?? null;
      let taxAmount = invoice.taxAmount;

      if (taxAmount === undefined || taxAmount === null) {
        if (
          taxType === TaxType.TAXABLE_5_PERCENT ||
          taxType === TaxType.NON_DEDUCTIBLE_5_PERCENT
        ) {
          taxAmount = Math.round((invoice.amountOriginal / 1.05) * 0.05);
        } else {
          taxAmount = 0;
        }
      }

      return {
        entityId: payload.entityId,
        vendorId: invoice.vendorId,
        invoiceNo: invoice.invoiceNo,
        amountOriginal: invoice.amountOriginal,
        amountCurrency: invoice.amountCurrency ?? 'TWD',
        amountFxRate: 1,
        amountBase: invoice.amountOriginal,
        taxType,
        taxAmount,
        invoiceDate,
        dueDate,
        nextDueDate: isMonthly ? dueDate : null,
        paymentFrequency: invoice.paymentFrequency ?? ApPaymentFrequency.ONE_TIME,
        isRecurringMonthly: isMonthly,
        recurringDayOfMonth: isMonthly ? dueDate.getUTCDate() : null,
        notes: invoice.notes ?? null,
      };
    });

    return this.apRepository.createInvoicesBatch(invoices);
  }

  /**
   * 記錄付款
   * TODO: 產生分錄（借：應付帳款 / 貸：銀行存款）
   */
  async recordPayment(invoiceId: string, data: any) {
    // Check if it's a payment task
    const task = await this.apRepository.findPaymentTaskById(invoiceId);
    if (task) {
      const status = data.newStatus === 'paid' ? 'paid' : 'pending';
      return this.apRepository.updatePaymentTaskStatus(invoiceId, status);
    }

    return this.apRepository.recordPayment(invoiceId, data);
  }

  async updateInvoice(id: string, dto: UpdateApInvoiceDto) {
    const data: Record<string, unknown> = {};
    if (dto.paymentFrequency) {
      data.paymentFrequency = dto.paymentFrequency;
      if (dto.paymentFrequency === ApPaymentFrequency.MONTHLY) {
        data.isRecurringMonthly = true;
        if (dto.recurringDayOfMonth) {
          data.recurringDayOfMonth = dto.recurringDayOfMonth;
        }
      } else {
        data.isRecurringMonthly = false;
        data.recurringDayOfMonth = null;
        data.nextDueDate = null;
      }
    }
    if (typeof dto.isRecurringMonthly === 'boolean') {
      data.isRecurringMonthly = dto.isRecurringMonthly;
    }
    if (dto.recurringDayOfMonth) {
      data.recurringDayOfMonth = dto.recurringDayOfMonth;
    }
    if (dto.dueDate) {
      const dueDate = new Date(dto.dueDate);
      data.dueDate = dueDate;
      if (data.isRecurringMonthly || dto.paymentFrequency === ApPaymentFrequency.MONTHLY) {
        data.nextDueDate = dueDate;
      }
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    return this.apRepository.updateInvoice(id, data);
  }

  /**
   * 到期應付款報表
   * 依到期日分組統計
   */
  async getDuePayablesReport(entityId: string) {
    // TODO: 依 due_date 分組
    return {
      entityId,
      asOfDate: new Date(),
      buckets: [
        { label: '已逾期', amount: 0 },
        { label: '7天內到期', amount: 0 },
        { label: '30天內到期', amount: 0 },
        { label: '30天後到期', amount: 0 },
      ],
      totalAp: 0,
    };
  }

  /**
   * 批次付款
   */
  async batchPayment(invoiceIds: string[], paymentDate: Date) {
    // TODO: 批次產生付款記錄與分錄
  }

  /**
   * 付款排程
   */
  async schedulePayment(invoiceId: string, scheduledDate: Date) {
    // TODO: 設定付款排程
  }

  /**
   * 從費用申請建立應付發票
   * @param expenseRequestId - 費用申請ID
   * @returns 建立的應付發票
   */
  async createApFromExpenseRequest(expenseRequestId: string) {
    this.logger.log(
      `Creating AP invoice from expense request: ${expenseRequestId}`,
    );
    throw new Error('Not implemented: createApFromExpenseRequest');
  }

  /**
   * 標記為已付款
   * @param invoiceId - 發票ID
   * @param paymentDate - 付款日期
   * @param bankAccountId - 銀行帳戶ID
   * @returns 更新後的發票資訊
   */
  async markAsPaid(
    invoiceId: string,
    paymentDate: Date,
    bankAccountId: string,
  ) {
    this.logger.log(
      `Marking invoice ${invoiceId} as paid, payment date: ${paymentDate}`,
    );
    throw new Error('Not implemented: markAsPaid');
  }

  /**
   * 取得到期報表
   * @param entityId - 實體ID
   * @param asOfDate - 統計基準日期
   * @returns 到期報表
   */
  async getDueReport(entityId: string, asOfDate: Date) {
    this.logger.log(
      `Generating due report for entity ${entityId} as of ${asOfDate}`,
    );
    throw new Error('Not implemented: getDueReport');
  }

  /**
   * 套用折扣
   * @param invoiceId - 發票ID
   * @param discountAmount - 折扣金額
   * @returns 更新後的發票資訊
   */
  async applyDiscount(invoiceId: string, discountAmount: number) {
    this.logger.log(
      `Applying discount of ${discountAmount} to invoice ${invoiceId}`,
    );
    throw new Error('Not implemented: applyDiscount');
  }

  async getInvoiceAlerts(entityId?: string) {
    return this.apRepository.getInvoiceAlerts(entityId);
  }
}
