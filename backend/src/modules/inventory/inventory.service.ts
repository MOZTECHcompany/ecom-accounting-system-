import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface CreateWarehouseInput {
  entityId: string;
  code: string;
  name: string;
  type?: string;
}

interface AdjustStockInput {
  entityId: string;
  warehouseId: string;
  productId: string;
  quantity: Prisma.Decimal | number; // 正數: IN, 負數: OUT
  direction: 'IN' | 'OUT' | 'ADJUST';
  referenceType: string; // PURCHASE_ORDER, SALES_ORDER, ADJUSTMENT 等
  referenceId?: string;
  reason?: string;
  occurredAt?: Date;
}

interface ReserveStockInput {
  entityId: string;
  warehouseId: string;
  productId: string;
  quantity: Prisma.Decimal | number;
  referenceType: 'SALES_ORDER';
  referenceId: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查詢倉庫列表
   */
  async getWarehouses(entityId: string) {
    return this.prisma.warehouse.findMany({
      where: { entityId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 建立倉庫（若 code 已存在則直接回傳既有倉庫）
   */
  async createWarehouse(input: CreateWarehouseInput) {
    const entityId = input.entityId?.trim();
    const code = input.code?.trim();
    const name = input.name?.trim();
    const type = input.type?.trim() || 'INTERNAL';

    if (!entityId || !code || !name) {
      throw new BadRequestException('Missing required fields: entityId, code, name');
    }

    const existing = await this.prisma.warehouse.findUnique({
      where: {
        entityId_code: {
          entityId,
          code,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.warehouse.create({
      data: {
        entityId,
        code,
        name,
        type,
        isActive: true,
      },
    });
  }

  /**
   * 取得指定商品在所有倉庫的庫存快照
   */
  async getSnapshotsForProduct(entityId: string, productId: string) {
    return this.prisma.inventorySnapshot.findMany({
      where: { entityId, productId },
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: {
        warehouse: {
          code: 'asc',
        },
      },
    });
  }

  /**
   * 通用庫存異動（進貨入庫、出貨出庫、盤點調整等）
   */
  async adjustStock(input: AdjustStockInput) {
    const {
      entityId,
      warehouseId,
      productId,
      quantity,
      direction,
      referenceType,
      referenceId,
      reason,
      occurredAt,
    } = input;

    // 確保倉庫與商品存在
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: warehouseId, entityId, isActive: true },
      }),
      this.prisma.product.findFirst({
        where: { id: productId, entityId, isActive: true },
      }),
    ]);

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found or inactive');
    }
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    const qty = new Prisma.Decimal(quantity as any);

    return this.prisma.$transaction(async (tx) => {
      // 1. 建立異動紀錄
      const movement = await tx.inventoryTransaction.create({
        data: {
          entityId,
          warehouseId,
          productId,
          direction,
          quantity: qty,
          referenceType,
          referenceId,
          reason,
          occurredAt: occurredAt ?? new Date(),
        },
      });

      // 2. 取得或建立 snapshot
      const snapshot = await tx.inventorySnapshot.upsert({
        where: {
          entityId_warehouseId_productId: {
            entityId,
            warehouseId,
            productId,
          },
        },
        create: {
          entityId,
          warehouseId,
          productId,
          qtyOnHand: direction === 'IN' ? qty : qty.mul(-1),
          qtyAllocated: new Prisma.Decimal(0),
          qtyAvailable: direction === 'IN' ? qty : qty.mul(-1),
        },
        update: {
          qtyOnHand:
            direction === 'IN'
              ? { increment: qty }
              : direction === 'OUT'
                ? { decrement: qty }
                : qty, // ADJUST 模式下可視需要改成直接覆寫
          qtyAvailable:
            direction === 'IN'
              ? { increment: qty }
              : direction === 'OUT'
                ? { decrement: qty }
                : qty,
        },
      });

      return { movement, snapshot };
    });
  }

  /**
   * 預留庫存（銷售訂單建立時）
   */
  async reserveStock(input: ReserveStockInput) {
    const {
      entityId,
      warehouseId,
      productId,
      quantity,
      referenceId,
      referenceType,
    } = input;
    const qty = new Prisma.Decimal(quantity as any);

    return this.prisma.$transaction(async (tx) => {
      // 檢查是否有足夠可用庫存
      const snapshot = await tx.inventorySnapshot.findUnique({
        where: {
          entityId_warehouseId_productId: {
            entityId,
            warehouseId,
            productId,
          },
        },
      });

      if (!snapshot || snapshot.qtyAvailable.lt(qty)) {
        throw new NotFoundException('Not enough available stock to reserve');
      }

      // 建立異動紀錄（RESERVE）
      const movement = await tx.inventoryTransaction.create({
        data: {
          entityId,
          warehouseId,
          productId,
          direction: 'RESERVE',
          quantity: qty,
          referenceType,
          referenceId,
          occurredAt: new Date(),
        },
      });

      // 更新 snapshot：Allocated +, Available -
      const updatedSnapshot = await tx.inventorySnapshot.update({
        where: {
          entityId_warehouseId_productId: {
            entityId,
            warehouseId,
            productId,
          },
        },
        data: {
          qtyAllocated: { increment: qty },
          qtyAvailable: { decrement: qty },
        },
      });

      return { movement, snapshot: updatedSnapshot };
    });
  }

  /**
   * 釋放預留庫存（訂單取消或調整）
   */
  async releaseReservedStock(input: ReserveStockInput) {
    const {
      entityId,
      warehouseId,
      productId,
      quantity,
      referenceId,
      referenceType,
    } = input;
    const qty = new Prisma.Decimal(quantity as any);

    return this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.inventorySnapshot.findUnique({
        where: {
          entityId_warehouseId_productId: {
            entityId,
            warehouseId,
            productId,
          },
        },
      });

      if (!snapshot || snapshot.qtyAllocated.lt(qty)) {
        throw new NotFoundException('Not enough allocated stock to release');
      }

      const movement = await tx.inventoryTransaction.create({
        data: {
          entityId,
          warehouseId,
          productId,
          direction: 'RELEASE',
          quantity: qty,
          referenceType,
          referenceId,
          occurredAt: new Date(),
        },
      });

      const updatedSnapshot = await tx.inventorySnapshot.update({
        where: {
          entityId_warehouseId_productId: {
            entityId,
            warehouseId,
            productId,
          },
        },
        data: {
          qtyAllocated: { decrement: qty },
          qtyAvailable: { increment: qty },
        },
      });

      return { movement, snapshot: updatedSnapshot };
    });
  }

  /**
   * 批次新增庫存序號 (進貨時)
   */
  async addSerialNumbers(
    entityId: string,
    warehouseId: string,
    productId: string,
    serialNumbers: string[],
    inboundRefType: string,
    inboundRefId: string,
  ) {
    if (!serialNumbers || serialNumbers.length === 0) return;

    const data = serialNumbers.map((sn) => ({
      entityId,
      productId,
      warehouseId,
      serialNumber: sn,
      status: 'AVAILABLE',
      inboundRefType,
      inboundRefId,
    }));

    await this.prisma.inventorySerialNumber.createMany({
      data,
      skipDuplicates: true, 
    });
  }

  /**
   * 將序號標記為已售出 (Outbound)
   */
  async markSerialNumbersAsSold(params: {
    entityId: string;
    warehouseId: string;
    productId: string;
    serialNumbers: string[];
    outboundRefType: string;
    outboundRefId: string;
  }) {
    const {
      entityId,
      warehouseId,
      productId,
      serialNumbers,
      outboundRefType,
      outboundRefId,
    } = params;

    if (!serialNumbers || serialNumbers.length === 0) {
      return;
    }

    // 1. 驗證所有序號是否存在且狀態為 AVAILABLE
    const existingSNs = await this.prisma.inventorySerialNumber.findMany({
      where: {
        entityId,
        productId,
        warehouseId,
        serialNumber: { in: serialNumbers },
        status: 'AVAILABLE',
      },
    });

    if (existingSNs.length !== serialNumbers.length) {
      const foundSNs = existingSNs.map((sn) => sn.serialNumber);
      const missingSNs = serialNumbers.filter((sn) => !foundSNs.includes(sn));
      throw new Error(
        `Some serial numbers are invalid or not available: ${missingSNs.join(', ')}`,
      );
    }

    // 2. 更新狀態
    await this.prisma.inventorySerialNumber.updateMany({
      where: {
        entityId,
        productId,
        warehouseId,
        serialNumber: { in: serialNumbers },
      },
      data: {
        status: 'SOLD',
        warehouseId: null, // 移出倉庫
        outboundRefType,
        outboundRefId,
      },
    });
  }
}
