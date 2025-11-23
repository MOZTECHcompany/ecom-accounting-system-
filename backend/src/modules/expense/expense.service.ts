import { Injectable, Logger } from '@nestjs/common';
import { ExpenseRepository } from './expense.repository';

/**
 * 費用管理服務
 * 
 * 核心功能：
 * 1. 費用申請單管理
 * 2. 費用分類與科目對應
 * 3. 費用審核流程
 * 4. 費用報銷與付款
 */
@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);
  constructor(private readonly expenseRepository: ExpenseRepository) {}
  /**
   * 建立費用申請單
   */
  async createExpenseRequest(data: any) {
    // TODO: 建立費用申請
    // TODO: 啟動審核流程
  }

  /**
   * 查詢費用申請單列表
   */
  async getExpenseRequests(entityId?: string, status?: string) {
    // TODO: 查詢費用申請單
  }

  /**
   * 審核費用申請
   */
  async approveExpenseRequest(requestId: string, approverId: string) {
    // TODO: 更新審核狀態
    // TODO: 如果審核通過，建立AP發票
  }

  /**
   * 拒絕費用申請
   */
  async rejectExpenseRequest(requestId: string, reason: string) {
    // TODO: 更新狀態為拒絕
    // TODO: 通知申請人
  }

  /**
   * 費用報銷（產生付款）
   */
  async reimburseExpense(requestId: string) {
    // TODO: 建立付款記錄
    // TODO: 產生會計分錄
  }

  /**
   * 費用分類報表
   */
  async getExpenseByCategory(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 依費用類別統計
  }

  /**
   * 提交費用申請
   * @param data - 費用申請資料
   * @param requestedBy - 申請人ID
   * @returns 建立的費用申請單
   */
  async submitExpenseRequest(data: any, requestedBy: string) {
    this.logger.log(`Submitting expense request by user: ${requestedBy}`);
    throw new Error('Not implemented: submitExpenseRequest');
  }

  /**
   * 連結至應付發票
   * @param expenseRequestId - 費用申請ID
   * @param apInvoiceId - 應付發票ID
   * @returns 更新後的費用申請單
   */
  async linkToApInvoice(expenseRequestId: string, apInvoiceId: string) {
    this.logger.log(`Linking expense request ${expenseRequestId} to AP invoice ${apInvoiceId}`);
    throw new Error('Not implemented: linkToApInvoice');
  }

  /**
   * 按類別統計費用
   * @param entityId - 實體ID
   * @param startDate - 開始日期
   * @param endDate - 結束日期
   * @returns 費用統計報表
   */
  async getExpensesByCategory(entityId: string, startDate: Date, endDate: Date) {
    this.logger.log(`Getting expenses by category for entity ${entityId}, period: ${startDate} - ${endDate}`);
    throw new Error('Not implemented: getExpensesByCategory');
  }

  /**
   * 取得可用的報銷項目（ReimbursementItem）清單
   * 會根據 entity / 角色 / 部門過濾
   */
  async getReimbursementItems(entityId: string, options?: { roles?: string[]; departmentId?: string }) {
    this.logger.log(
      `Fetching reimbursement items for entity ${entityId} with roles=${options?.roles?.join(',') ?? 'N/A'} department=${
        options?.departmentId ?? 'N/A'
      }`,
    );
    return this.expenseRepository.findActiveReimbursementItems(entityId, options);
  }
}
