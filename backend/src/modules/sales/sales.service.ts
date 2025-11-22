import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

/**
 * SalesService
 * 銷售服務基礎類別
 */
@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * 查詢銷售渠道
   */
  async getSalesChannels(entityId: string) {
    return this.prisma.salesChannel.findMany({
      where: {
        entityId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 查詢客戶
   */
  async getCustomers(entityId: string) {
    return this.prisma.customer.findMany({
      where: {
        entityId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 查詢商品
   */
  async getProducts(entityId: string) {
    return this.prisma.product.findMany({
      where: {
        entityId,
        isActive: true,
      },
      orderBy: { sku: 'asc' },
    });
  }

  /**
   * 銷售訂單出貨時扣減庫存並釋放預留量
   */
  async fulfillSalesOrder(params: {
    entityId: string;
    warehouseId: string;
    salesOrderId: string;
  }) {
    const { entityId, warehouseId, salesOrderId } = params;

    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true },
    });

    if (!order || order.entityId !== entityId) {
      throw new Error('Sales order not found for entity');
    }

    for (const item of order.items) {
      const qty = item.qty;

      // 1) 釋放預留庫存
      await this.inventoryService.releaseReservedStock({
        entityId,
        warehouseId,
        productId: item.productId,
        quantity: qty,
        referenceType: 'SALES_ORDER',
        referenceId: salesOrderId,
      });

      // 2) 實際出庫
      await this.inventoryService.adjustStock({
        entityId,
        warehouseId,
        productId: item.productId,
        quantity: qty,
        direction: 'OUT',
        referenceType: 'SALES_ORDER',
        referenceId: salesOrderId,
        reason: 'Sales order shipment',
      });
    }

    return { success: true };
  }
}
