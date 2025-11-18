import { Injectable } from '@nestjs/common';

/**
 * 薪資管理服務
 * 
 * 核心功能：
 * 1. 薪資批次計算
 * 2. 勞健保計算（台灣/大陸）
 * 3. 薪資分錄自動產生
 * 4. 薪資報表
 */
@Injectable()
export class PayrollService {
  /**
   * 建立薪資批次
   */
  async createPayrollRun(data: {
    entityId: string;
    periodStart: Date;
    periodEnd: Date;
    payDate: Date;
  }) {
    // TODO: 建立薪資批次
    // TODO: 自動計算所有員工薪資
  }

  /**
   * 計算員工薪資
   */
  async calculateEmployeePayroll(employeeId: string, periodStart: Date, periodEnd: Date) {
    // TODO: 計算基本薪資
    // TODO: 計算加班費
    // TODO: 計算獎金
    // TODO: 扣除勞健保、稅金
  }

  /**
   * 計算勞健保（台灣）
   */
  async calculateLaborInsurance(salary: number, employeeType: string) {
    // TODO: 依台灣勞健保費率計算
    // TODO: 分攤公司負擔與個人負擔
  }

  /**
   * 計算社保（大陸）
   */
  async calculateSocialInsurance(salary: number, city: string) {
    // TODO: 依城市的社保費率計算
  }

  /**
   * 產生薪資分錄
   */
  async generatePayrollJournalEntry(payrollRunId: string) {
    // TODO: 產生薪資分錄
    // 借：薪資費用、勞健保費用（公司負擔）
    // 貸：應付薪資、應付勞健保、應付所得稅
  }

  /**
   * 薪資發放
   */
  async payPayroll(payrollRunId: string) {
    // TODO: 標記為已發放
    // TODO: 產生銀行付款分錄
  }

  /**
   * 薪資報表
   */
  async getPayrollReport(entityId: string, periodStart: Date, periodEnd: Date) {
    // TODO: 產生薪資彙總表
  }

  /**
   * 年度薪資總表（用於報稅）
   */
  async getAnnualPayrollSummary(entityId: string, year: number) {
    // TODO: 產生年度薪資總表
  }
}
