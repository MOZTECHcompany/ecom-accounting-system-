import { Injectable } from '@nestjs/common';

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
}
