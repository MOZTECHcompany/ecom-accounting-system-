import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { CostService } from '../cost/cost.service';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly costService: CostService,
  ) {}

  async create(entityId: string, dto: CreatePurchaseOrderDto) {
    // Calculate totals
    let totalAmountOriginal = 0;
    
    // Verify items and calculate total
    for (const item of dto.items) {
      totalAmountOriginal += item.qty * item.unitCost;
    }

    const totalAmountBase = totalAmountOriginal * dto.fxRate;

    return this.prisma.purchaseOrder.create({
      data: {
        entityId,
        vendorId: dto.vendorId,
        orderDate: new Date(dto.orderDate),
        totalAmountOriginal,
        totalAmountCurrency: dto.currency,
        totalAmountFxRate: dto.fxRate,
        totalAmountBase,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitCostOriginal: item.unitCost,
            unitCostCurrency: dto.currency,
            unitCostFxRate: dto.fxRate,
            unitCostBase: item.unitCost * dto.fxRate,
          })),
        },
      },
      include: {
        items: true,
        vendor: true,
      },
    });
  }

  async findAll(entityId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { entityId },
      include: {
        vendor: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async findOne(entityId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, entityId },
      include: {
        vendor: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    return po;
  }

  /**
   * Receive Purchase Order (Inbound)
   * Triggers inventory update and cost recording
   */
  async receiveOrder(entityId: string, id: string, dto: ReceivePurchaseOrderDto) {
    const { warehouseId, serialNumbers } = dto;
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, entityId },
        include: {
          vendor: true,
          items: { include: { product: true } },
        },
      });
      if (!po) throw new NotFoundException('Purchase Order not found');
      if (po.status === 'received' || po.status === 'completed') {
        return po;
      }
      if (po.status !== 'pending') {
        throw new BadRequestException(`Purchase Order cannot be received from status ${po.status}`);
      }

      // Conditional status claim makes concurrent retries idempotent. The claim,
      // inventory, serial numbers, cost and final status share one transaction.
      const claimed = await tx.purchaseOrder.updateMany({
        where: { id, entityId, status: 'pending' },
        data: { status: 'receiving' },
      });
      if (claimed.count !== 1) {
        const latest = await tx.purchaseOrder.findFirst({
          where: { id, entityId },
          include: { vendor: true, items: { include: { product: true } } },
        });
        if (latest?.status === 'received' || latest?.status === 'completed') return latest;
        throw new BadRequestException('Purchase Order is already being processed');
      }

      const warehouse = await tx.warehouse.findFirst({
        where: { id: warehouseId, entityId, isActive: true },
      });
      if (!warehouse) throw new BadRequestException('Warehouse not found or inactive');

      const serialRequirements = new Map<
        string,
        { sku: string; quantity: number; serialNumbers: string[] }
      >();
      for (const item of po.items) {
        if (!item.product.hasSerialNumbers) continue;
        const current = serialRequirements.get(item.productId) || {
          sku: item.product.sku,
          quantity: 0,
          serialNumbers:
            serialNumbers?.find((entry) => entry.productId === item.productId)?.serialNumbers || [],
        };
        current.quantity += Number(item.qty);
        serialRequirements.set(item.productId, current);
      }
      for (const requirement of serialRequirements.values()) {
        const unique = new Set(requirement.serialNumbers.map((serial) => serial.trim()));
        if (
          unique.size !== requirement.quantity ||
          requirement.serialNumbers.length !== requirement.quantity ||
          [...unique].some((serial) => !serial)
        ) {
          throw new BadRequestException(
            `Product ${requirement.sku} requires ${requirement.quantity} unique serial numbers, but got ${requirement.serialNumbers.length}`,
          );
        }
      }

      for (const item of po.items) {
        await this.inventoryService.adjustStock(
          {
            entityId,
            warehouseId,
            productId: item.productId,
            quantity: Number(item.qty),
            direction: 'IN',
            reason: `Purchase Order Receive: ${po.id}`,
            referenceType: 'PURCHASE_ORDER',
            referenceId: po.id,
          },
          tx,
        );
      }
      for (const [productId, requirement] of serialRequirements) {
        await this.inventoryService.addSerialNumbers(
          entityId,
          warehouseId,
          productId,
          requirement.serialNumbers,
          'PURCHASE_ORDER',
          po.id,
          tx,
        );
      }

      await this.costService.recordPurchaseCost(po.id, tx);
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: 'received' },
        include: { vendor: true, items: { include: { product: true } } },
      });
    }, { maxWait: 5_000, timeout: 20_000 });
  }
}
