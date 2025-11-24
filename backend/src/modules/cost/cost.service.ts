import { Injectable } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';

/**
 * 成本管理服務
 *
 * 核心功能：
 * 1. 進貨成本管理
 * 2. 開發成本攤提（模具費、檢驗費等）
 * 3. 成本分攤規則
 * 4. 銷貨成本計算（FIFO/LIFO/加權平均）
 */
@Injectable()
export class CostService {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * 記錄進貨成本
   */
  async recordPurchaseCost(purchaseOrderId: string) {
    // TODO: 計算進貨總成本（含運費、關稅等）
    // TODO: 產生進貨成本分錄
    // TODO: 呼叫 InventoryService.adjustStock 依進貨明細入庫
  }

  /**
   * 記錄開發成本
   */
  async recordDevCost(data: {
    productId: string;
    costType: 'MOLD' | 'INSPECTION' | 'DESIGN' | 'OTHER';
    amount: number;
  }) {
    // TODO: 記錄開發成本
    // TODO: 設定攤提規則
  }

  /**
   * 攤提開發成本
   */
  async amortizeDevCost(devCostId: string, quantity: number) {
    // TODO: 依出貨數量攤提開發成本
    // TODO: 產生攤提分錄
  }

  /**
   * 計算銷貨成本（COGS）
   */
  async calculateCOGS(
    salesOrderId: string,
    method: 'FIFO' | 'LIFO' | 'WEIGHTED_AVG',
  ) {
    // TODO: 根據方法計算COGS
    // TODO: 產生COGS分錄（借：銷貨成本 / 貸：存貨）
  }

  /**
   * 批次成本追蹤
   */
  async trackBatchCost(batchId: string) {
    // TODO: 追蹤批次的完整成本
    // TODO: 包含進貨成本、攤提的開發成本等
  }

  /**
   * 成本差異分析
   */
  async analyzeCostVariance(
    productId: string,
    period: { start: Date; end: Date },
  ) {
    // TODO: 比較標準成本與實際成本
  }
}
