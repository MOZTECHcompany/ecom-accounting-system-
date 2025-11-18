import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';

/**
 * InvoicingService
 * 
 * 電子發票服務
 * 
 * TODO: 實作項目
 * 1. 串接財政部電子發票API
 * 2. 發票號碼管理（配號、使用、作廢）
 * 3. 發票格式驗證（字軌、稅額計算）
 * 4. 自動上傳大平台
 * 5. B2B發票開立與通知
 * 6. 發票作廢與折讓處理
 * 7. 發票查詢與統計報表
 */
@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 預覽某筆交易要開立的發票內容
   * 
   * @param dto - 預覽發票DTO
   * @returns 發票預覽資料
   * 
   * TODO: 實作邏輯
   * - 從交易資料計算發票金額、稅額
   * - 判斷適用的稅率（5%、零稅率、免稅）
   * - 產生發票明細項目
   * - 檢查客戶統編（B2B發票）
   */
  async previewInvoiceForTransaction(dto: PreviewInvoiceDto) {
    this.logger.log(`預覽發票 - 交易ID: ${dto.transactionId}`);

    // TODO: 實作發票預覽邏輯
    // 目前回傳 mock 資料
    return {
      invoiceType: dto.invoiceType || 'B2C', // B2C: 個人, B2B: 公司
      transactionId: dto.transactionId,
      transactionType: dto.transactionType, // order, payment, refund
      
      // 買方資料
      buyer: {
        name: '測試客戶',
        taxId: dto.buyerTaxId || '',
        address: '台北市信義區',
      },
      
      // 發票金額
      amounts: {
        subtotal: 1000,
        taxRate: 0.05,
        taxAmount: 50,
        total: 1050,
        currency: 'TWD',
      },
      
      // 發票明細
      items: [
        {
          description: '商品A',
          quantity: 2,
          unitPrice: 500,
          amount: 1000,
        },
      ],
      
      // 預估發票號碼（配號規則）
      estimatedInvoiceNumber: 'AA12345678',
      
      // 提醒事項
      warnings: dto.buyerTaxId
        ? []
        : ['B2C發票：客戶未提供統編，將開立個人發票'],
    };
  }

  /**
   * 對某筆交易開立正式發票
   * 
   * @param dto - 開立發票DTO
   * @returns 發票開立結果
   * 
   * TODO: 實作邏輯
   * - 從發票號碼池取得可用號碼
   * - 驗證發票資料完整性
   * - 呼叫財政部API開立發票
   * - 儲存發票資料到資料庫
   * - 產生發票PDF
   * - 如為B2B，通知客戶取票
   * - 如為B2C，可透過email/簡訊通知
   */
  async issueInvoiceForTransaction(dto: IssueInvoiceDto, userId: string) {
    this.logger.log(
      `開立發票 - 交易ID: ${dto.transactionId}, 操作者: ${userId}`,
    );

    // TODO: 實作發票開立邏輯
    // 目前回傳 mock 結果
    return {
      success: true,
      invoiceNumber: 'AA12345678',
      invoiceDate: new Date(),
      transactionId: dto.transactionId,
      invoiceType: dto.invoiceType || 'B2C',
      
      // 買方資料
      buyer: {
        name: dto.buyerName,
        taxId: dto.buyerTaxId || '',
        address: dto.buyerAddress || '',
      },
      
      // 金額
      amounts: {
        subtotal: 1000,
        taxAmount: 50,
        total: 1050,
        currency: 'TWD',
      },
      
      // API回應（模擬）
      apiResponse: {
        code: '200',
        message: 'Invoice issued successfully (MOCK)',
      },
      
      // PDF下載連結（未來實作）
      pdfUrl: null,
      
      // 提示訊息
      message: '發票開立成功（模擬）。實際環境需串接財政部API。',
    };
  }

  /**
   * 作廢發票
   * 
   * @param invoiceNumber - 發票號碼
   * @param reason - 作廢原因
   * @param userId - 操作者ID
   * 
   * TODO: 實作邏輯
   * - 檢查發票是否可作廢（時限限制）
   * - 呼叫財政部API作廢
   * - 更新資料庫狀態
   * - 產生作廢證明
   */
  async voidInvoice(invoiceNumber: string, reason: string, userId: string) {
    this.logger.log(
      `作廢發票 - 號碼: ${invoiceNumber}, 原因: ${reason}, 操作者: ${userId}`,
    );

    // TODO: 實作作廢邏輯
    return {
      success: true,
      invoiceNumber,
      voidDate: new Date(),
      reason,
      message: '發票作廢成功（模擬）',
    };
  }

  /**
   * 開立發票折讓單
   * 
   * @param invoiceNumber - 原發票號碼
   * @param allowanceAmount - 折讓金額
   * @param reason - 折讓原因
   * @param userId - 操作者ID
   * 
   * TODO: 實作邏輯
   * - 檢查原發票存在且有效
   * - 計算折讓稅額
   * - 呼叫財政部API開立折讓
   * - 產生折讓證明單
   */
  async issueAllowance(
    invoiceNumber: string,
    allowanceAmount: number,
    reason: string,
    userId: string,
  ) {
    this.logger.log(
      `開立折讓 - 發票: ${invoiceNumber}, 金額: ${allowanceAmount}, 操作者: ${userId}`,
    );

    // TODO: 實作折讓邏輯
    return {
      success: true,
      invoiceNumber,
      allowanceNumber: 'AL12345678',
      allowanceDate: new Date(),
      allowanceAmount,
      taxAmount: Math.round(allowanceAmount * 0.05 * 100) / 100,
      reason,
      message: '折讓單開立成功（模擬）',
    };
  }
}
