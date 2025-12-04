import { Injectable, Logger } from '@nestjs/common';
import { AttendanceIntegrationService } from '../attendance/services/integration.service';

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
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly attendanceIntegration: AttendanceIntegrationService,
  ) {}
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
  async calculateEmployeePayroll(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    this.logger.log(`Calculating payroll for employee ${employeeId}`);

    // 1. Get Attendance Data
    const attendanceData = await this.attendanceIntegration.getPayrollData(
      employeeId,
      periodStart,
      periodEnd,
    );

    this.logger.log(`Attendance data: ${JSON.stringify(attendanceData)}`);

    // TODO: 計算基本薪資 (Base Salary / Working Days * Days Worked)
    // TODO: 計算加班費 (Overtime Hours * Rate)
    // TODO: 計算獎金
    // TODO: 扣除勞健保、稅金

    return {
      employeeId,
      period: { start: periodStart, end: periodEnd },
      attendance: attendanceData,
      grossPay: 0, // Placeholder
      netPay: 0,   // Placeholder
    };
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

  /**
   * 計算薪資
   * @param entityId - 實體ID
   * @param year - 年份
   * @param month - 月份
   * @returns 薪資計算結果
   */
  async calculatePayroll(entityId: string, year: number, month: number) {
    this.logger.log(
      `Calculating payroll for entity ${entityId}, period: ${year}/${month}`,
    );
    throw new Error('Not implemented: calculatePayroll');
  }

  /**
   * 薪資過帳至會計
   * @param payrollRunId - 薪資批次ID
   * @returns 過帳結果
   */
  async postPayrollToAccounting(payrollRunId: string) {
    this.logger.log(`Posting payroll ${payrollRunId} to accounting`);
    throw new Error('Not implemented: postPayrollToAccounting');
  }

  /**
   * 沖回薪資
   * @param payrollRunId - 薪資批次ID
   * @param reason - 沖回原因
   * @returns 沖回結果
   */
  async reversePayroll(payrollRunId: string, reason: string) {
    this.logger.log(`Reversing payroll ${payrollRunId}, reason: ${reason}`);
    throw new Error('Not implemented: reversePayroll');
  }

  /**
   * 計算勞保
   * @param salary - 薪資金額
   * @returns 勞保金額
   */
  async calculateLaborInsurance(salary: number) {
    this.logger.log(`Calculating labor insurance for salary: ${salary}`);
    throw new Error('Not implemented: calculateLaborInsurance');
  }

  /**
   * 計算健保
   * @param salary - 薪資金額
   * @returns 健保金額
   */
  async calculateHealthInsurance(salary: number) {
    this.logger.log(`Calculating health insurance for salary: ${salary}`);
    throw new Error('Not implemented: calculateHealthInsurance');
  }
}
