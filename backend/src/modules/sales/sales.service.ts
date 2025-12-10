import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ProductType } from '@prisma/client';

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
      include: { 
        items: {
          include: { product: true }
        } 
      },
    });

    if (!order || order.entityId !== entityId) {
      throw new Error('Sales order not found for entity');
    }

    for (const item of order.items) {
      await this.fulfillInventoryForItem(
        entityId,
        warehouseId,
        salesOrderId,
        item.product,
        Number(item.qty)
      );
    }

    return { success: true };
  }

  /**
   * 遞迴扣減庫存 (支援 Bundle 展開)
   */
  private async fulfillInventoryForItem(
    entityId: string,
    warehouseId: string,
    orderId: string,
    product: any,
    qty: number,
  ) {
    if (product.type === ProductType.BUNDLE) {
      // 展開 BOM
      const bom = await this.prisma.billOfMaterial.findMany({
        where: { parentId: product.id },
        include: { child: true },
      });

      if (bom.length === 0) {
        this.logger.warn(`Bundle product ${product.sku} has no BOM components defined.`);
        return;
      }

      for (const component of bom) {
        const requiredQty = Number(component.quantity) * qty;
        await this.fulfillInventoryForItem(
          entityId,
          warehouseId,
          orderId,
          component.child,
          requiredQty,
        );
      }
    } else {
      if (product.type === ProductType.SERVICE) return;

      // 1) 釋放預留庫存
      await this.inventoryService.releaseReservedStock({
        entityId,
        warehouseId,
        productId: product.id,
        quantity: qty,
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
      });

      // 2) 實際出庫
      await this.inventoryService.adjustStock({
        entityId,
        warehouseId,
        productId: product.id,
        quantity: qty,
        direction: 'OUT',
        referenceType: 'SALES_ORDER',
        referenceId: orderId,
        reason: 'Sales order shipment',
      });
    }
  }
}
