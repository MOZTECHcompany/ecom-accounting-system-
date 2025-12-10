import { Injectable, Logger } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductType } from '@prisma/client';

/**
 * 成本管理服務
 *
 * 核心功能：
 * 1. 進貨成本管理
 * 2. 開發成本攤提（模具費、檢驗費等）
 * 3. 成本分攤規則
 * 4. 銷貨成本計算（FIFO/LIFO/加權平均）
 * 5. 浮動成本計算 (報價用)
 */
@Injectable()
export class CostService {
  private readonly logger = new Logger(CostService.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 計算產品浮動成本 (Floating Cost)
   * 用於報價參考，包含 BOM 展開成本與服務費用 (如包裝費)
   * 
   * 邏輯：
   * 1. 若為 SIMPLE 產品：回傳移動平均成本 (Moving Average Cost) 或 最新進貨價
   * 2. 若為 BUNDLE/MANUFACTURED：遞迴計算所有子元件成本總和
   * 3. 若為 SERVICE：回傳最新採購價 (例如包裝服務費)
   */
  async calculateFloatingCost(entityId: string, productId: string): Promise<number> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.entityId !== entityId) {
      throw new Error('Product not found');
    }

    // 1. 簡單商品或服務：直接回傳成本
    if (product.type === ProductType.SIMPLE || product.type === ProductType.SERVICE) {
      // 優先使用移動平均成本，若為 0 則使用最新進貨價
      const cost = Number(product.movingAverageCost) > 0 
        ? Number(product.movingAverageCost) 
        : Number(product.latestPurchasePrice);
      return cost;
    }

    // 2. 組合商品或製成品：展開 BOM 計算
    if (product.type === ProductType.BUNDLE || product.type === ProductType.MANUFACTURED) {
      const bom = await this.prisma.billOfMaterial.findMany({
        where: { parentId: productId },
        include: { child: true },
      });

      let totalCost = 0;

      for (const component of bom) {
        const componentCost = await this.calculateFloatingCost(entityId, component.childId);
        totalCost += componentCost * Number(component.quantity);
      }

      // 加上額外的固定製造費用 (Overhead) - 這裡暫時假設包含在 BOM 的 SERVICE 項目中
      // 如果有額外的 Overhead 欄位可以在此加入

      return totalCost;
    }

    return 0;
  }

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
