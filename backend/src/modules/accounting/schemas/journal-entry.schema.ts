/**
 * Journal Entry Validation Schema
 * 會計分錄驗證規則
 * 
 * 可以定義：
 * - 借貸平衡驗證
 * - 科目存在性驗證
 * - 期間狀態驗證
 * - 金額範圍驗證
 */

export class JournalEntryValidationSchema {
  /**
   * 驗證借貸平衡
   */
  static validateDebitCreditBalance(lines: Array<{ debit: number; credit: number }>): boolean {
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01; // 容許 0.01 誤差
  }

  /**
   * 驗證至少有兩筆分錄明細
   */
  static validateMinimumLines(lines: any[]): boolean {
    return lines.length >= 2;
  }

  /**
   * 驗證每筆明細必須有借或貸其中之一
   */
  static validateDebitOrCredit(lines: Array<{ debit: number; credit: number }>): boolean {
    return lines.every((line) => line.debit > 0 || line.credit > 0);
  }
}
