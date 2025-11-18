// @ts-nocheck
/**
 * MatchingRulesSchema
 * 
 * 銀行對帳匹配規則
 * 
 * 說明：
 * - 定義多層級匹配邏輯
 * - 計算匹配信心度
 * - 提供匹配建議
 */

export interface MatchingRule {
  name: string;
  priority: number; // 優先級，數字越大越優先
  weight: number; // 權重（用於計算信心度）
  matcher: (
    bankTx: any,
    journalEntry: any,
  ) => { matched: boolean; score: number };
}

export class MatchingRulesSchema {
  /**
   * 精準匹配規則：金額完全相同
   */
  static exactAmountRule: MatchingRule = {
    name: 'EXACT_AMOUNT',
    priority: 100,
    weight: 0.4,
    matcher: (bankTx, journalEntry) => {
      const matched = bankTx.amount === journalEntry.amount;
      return { matched, score: matched ? 1.0 : 0 };
    },
  };

  /**
   * 精準匹配規則：日期完全相同
   */
  static exactDateRule: MatchingRule = {
    name: 'EXACT_DATE',
    priority: 90,
    weight: 0.3,
    matcher: (bankTx, journalEntry) => {
      const matched = bankTx.date === journalEntry.date;
      return { matched, score: matched ? 1.0 : 0 };
    },
  };

  /**
   * 模糊匹配規則：日期在容差範圍內（±N天）
   */
  static fuzzyDateRule: MatchingRule = {
    name: 'FUZZY_DATE',
    priority: 80,
    weight: 0.2,
    matcher: (bankTx, journalEntry) => {
      // TODO: 實作日期範圍匹配
      const daysDiff = Math.abs(
        new Date(bankTx.date).getTime() -
          new Date(journalEntry.date).getTime(),
      ) / (1000 * 60 * 60 * 24);
      
      const matched = daysDiff <= 3; // 3天內
      const score = matched ? 1.0 - daysDiff / 10 : 0; // 距離越遠分數越低
      
      return { matched, score };
    },
  };

  /**
   * 精準匹配規則：虛擬帳號
   */
  static virtualAccountRule: MatchingRule = {
    name: 'VIRTUAL_ACCOUNT',
    priority: 95,
    weight: 0.5,
    matcher: (bankTx, journalEntry) => {
      if (!bankTx.virtualAccount || !journalEntry.virtualAccount) {
        return { matched: false, score: 0 };
      }
      const matched = bankTx.virtualAccount === journalEntry.virtualAccount;
      return { matched, score: matched ? 1.0 : 0 };
    },
  };

  /**
   * 模糊匹配規則：客戶名稱
   */
  static customerNameRule: MatchingRule = {
    name: 'CUSTOMER_NAME',
    priority: 70,
    weight: 0.15,
    matcher: (bankTx, journalEntry) => {
      // TODO: 實作模糊字串匹配（Levenshtein distance）
      if (!bankTx.counterpartyName || !journalEntry.customerName) {
        return { matched: false, score: 0 };
      }
      
      const similarity = 0.8; // Mock similarity
      const matched = similarity > 0.7;
      
      return { matched, score: similarity };
    },
  };

  /**
   * 計算整體匹配信心度
   * 
   * @param bankTx - 銀行交易
   * @param journalEntry - 會計分錄
   * @returns 信心度 (0~1)
   */
  static calculateConfidence(bankTx: any, journalEntry: any): number {
    const rules = [
      this.exactAmountRule,
      this.exactDateRule,
      this.fuzzyDateRule,
      this.virtualAccountRule,
      this.customerNameRule,
    ];

    let totalWeight = 0;
    let weightedScore = 0;

    rules.forEach((rule) => {
      const result = rule.matcher(bankTx, journalEntry);
      if (result.matched) {
        totalWeight += rule.weight;
        weightedScore += rule.score * rule.weight;
      }
    });

    // 至少要有金額匹配才算有效
    const amountResult = this.exactAmountRule.matcher(bankTx, journalEntry);
    if (!amountResult.matched) {
      return 0;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * 判斷是否為有效匹配
   * 
   * @param confidence - 信心度
   * @returns 是否有效
   */
  static isValidMatch(confidence: number): boolean {
    return confidence >= 0.7; // 信心度 >= 70% 才算有效匹配
  }

  /**
   * 取得匹配類型
   * 
   * @param confidence - 信心度
   * @returns 匹配類型
   */
  static getMatchType(confidence: number): 'EXACT' | 'FUZZY' | 'NONE' {
    if (confidence >= 0.95) return 'EXACT';
    if (confidence >= 0.7) return 'FUZZY';
    return 'NONE';
  }
}
