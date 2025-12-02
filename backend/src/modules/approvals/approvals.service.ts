import { Injectable } from '@nestjs/common';

/**
 * 審批流程服務
 *
 * 核心功能：
 * 1. 通用審批流程引擎
 * 2. 多層級審批設定
 * 3. 審批歷史記錄
 * 4. 自動通知與提醒
 */
@Injectable()
export class ApprovalsService {
  /**
   * 建立審批請求
   */
  async createApprovalRequest(data: {
    entityId: string;
    requestType: string; // EXPENSE, JOURNAL_ENTRY, PURCHASE_ORDER, etc.
    requestId: string;
    requesterId: string;
  }) {
    // TODO: 根據審批規則自動指派審批人
    // TODO: 發送通知
  }

  /**
   * 審批通過
   */
  async approve(requestId: string, approverId: string, comment?: string) {
    // TODO: 更新審批狀態
    // TODO: 檢查是否所有層級都已審批
    // TODO: 如果全部通過，觸發後續流程
  }

  /**
   * 審批駁回
   */
  async reject(requestId: string, approverId: string, reason: string) {
    // TODO: 更新審批狀態為駁回
    // TODO: 通知申請人
  }

  /**
   * 查詢待審批項目
   */
  async getPendingApprovals(approverId: string) {
    // TODO: 查詢該審批人的待審項目
  }

  /**
   * 審批歷史
   */
  async getApprovalHistory(requestType: string, requestId: string) {
    // TODO: 查詢完整審批記錄
  }

  /**
   * 設定審批規則
   */
  async setApprovalRule(data: {
    entityId: string;
    requestType: string;
    amountThreshold?: number;
    approverLevels: string[]; // userId[]
  }) {
    // TODO: 設定審批層級與規則
  }
}
