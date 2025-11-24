/**
 * InvoiceNumberConfigSchema
 *
 * 發票號碼配置規則
 *
 * 說明：
 * - 台灣電子發票號碼格式：2碼英文 + 8碼數字（例如：AA12345678）
 * - 字軌由財政部配發
 * - 每期發票有起訖號碼限制
 */

export class InvoiceNumberConfigSchema {
  /**
   * 驗證發票號碼格式
   *
   * @param invoiceNumber - 發票號碼
   * @returns 是否有效
   */
  static validateFormat(invoiceNumber: string): boolean {
    const pattern = /^[A-Z]{2}\d{8}$/;
    return pattern.test(invoiceNumber);
  }

  /**
   * 驗證字軌是否在可用範圍內
   *
   * @param prefix - 字軌前綴（例如：AA）
   * @param number - 流水號（例如：12345678）
   * @param availableRanges - 可用字軌範圍清單
   * @returns 是否在範圍內
   *
   * TODO: 實作邏輯
   * - 從資料庫或設定檔讀取可用字軌
   * - 檢查號碼是否在起訖範圍內
   * - 檢查是否已使用或作廢
   */
  static isInAvailableRange(
    prefix: string,
    number: number,
    availableRanges: Array<{ prefix: string; start: number; end: number }>,
  ): boolean {
    const range = availableRanges.find((r) => r.prefix === prefix);
    if (!range) return false;
    return number >= range.start && number <= range.end;
  }

  /**
   * 產生下一個可用發票號碼
   *
   * @param currentPrefix - 目前字軌
   * @param currentNumber - 目前號碼
   * @returns 下一個號碼
   *
   * TODO: 實作邏輯
   * - 檢查目前字軌是否用完
   * - 自動切換下一個字軌
   * - 標記已使用號碼
   */
  static getNextAvailableNumber(
    currentPrefix: string,
    currentNumber: number,
  ): { prefix: string; number: number } {
    // Mock implementation
    return {
      prefix: currentPrefix,
      number: currentNumber + 1,
    };
  }
}
