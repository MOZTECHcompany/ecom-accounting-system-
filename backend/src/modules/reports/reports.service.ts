import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * 報表服務
 *
 * 核心功能：
 * 1. 財務報表（損益表、資產負債表、現金流量表、權益變動表）
 * 2. 管理報表（銷售分析、成本分析、費用分析）
 * 3. 自訂報表
 * 4. 報表匯出（Excel, PDF）
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 損益表 (Income Statement / P&L)
   * 已在 AccountingModule 實作，這裡提供增強版
   */
  async getIncomeStatement(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 呼叫 AccountingService.getIncomeStatement
    // TODO: 增加比較期間功能
    // TODO: 增加預算比較
  }

  /**
   * 資產負債表 (Balance Sheet)
   */
  async getBalanceSheet(entityId: string, asOfDate: Date) {
    // TODO: 呼叫 AccountingService.getBalanceSheet
  }

  /**
   * 現金流量表 (Cash Flow Statement)
   */
  async getCashFlowStatement(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 分類：營運活動、投資活動、融資活動
  }

  /**
   * 權益變動表 (Statement of Changes in Equity)
   */
  async getEquityStatement(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 追蹤股本、保留盈餘變動
  }

  /**
   * 銷售分析報表
   */
  async getSalesAnalysis(
    entityId: string,
    groupBy: 'channel' | 'product' | 'customer',
    period: { start: Date; end: Date },
  ) {
    // TODO: 依渠道、商品、客戶分組分析銷售
  }

  /**
   * 成本分析報表
   */
  async getCostAnalysis(entityId: string, period: { start: Date; end: Date }) {
    // TODO: 分析各類成本占比
  }

  /**
   * 費用分析報表
   */
  async getExpenseAnalysis(
    entityId: string,
    groupBy: 'category' | 'department',
    period: { start: Date; end: Date },
  ) {
    // TODO: 依類別或部門分析費用
  }

  /**
   * 毛利分析
   */
  async getGrossMarginAnalysis(
    entityId: string,
    groupBy: 'product' | 'channel',
    period: { start: Date; end: Date },
  ) {
    // TODO: 計算各商品或渠道的毛利率
  }

  /**
   * 庫存報表
   */
  async getInventoryReport(entityId: string, asOfDate: Date) {
    // TODO: 列出所有庫存及其成本
  }

  /**
   * 自訂報表查詢
   */
  async executeCustomQuery(sql: string, params: any[]) {
    // TODO: 執行自訂SQL查詢（需權限控制）
  }

  /**
   * 匯出報表為Excel
   */
  async exportToExcel(reportType: string, data: any) {
    // TODO: 使用 xlsx 套件匯出
  }

  /**
   * 匯出報表為PDF
   */
  async exportToPDF(reportType: string, data: any) {
    // TODO: 使用 pdfkit 或 puppeteer 產生PDF
  }
}
