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
    const po = await this.findOne(entityId, id);

    if (po.status !== 'pending') {
      throw new BadRequestException('Purchase Order is not in pending status');
    }

    // 1. Update Inventory
    for (const item of po.items) {
      await this.inventoryService.adjustStock({
        entityId,
        warehouseId,
        productId: item.productId,
        quantity: Number(item.qty),
        direction: 'IN',
        reason: `Purchase Order Receive: ${po.id}`,
        referenceType: 'PURCHASE_ORDER',
        referenceId: po.id,
      });

      // Handle Serial Numbers
      if (item.product.hasSerialNumbers) {
        const entry = serialNumbers?.find(e => e.productId === item.productId);
        const snList = entry?.serialNumbers || [];
        
        // Validate count
        if (snList.length !== Number(item.qty)) {
           throw new BadRequestException(`Product ${item.product.sku} requires ${item.qty} serial numbers, but got ${snList.length}`);
        }

        await this.inventoryService.addSerialNumbers(
          entityId,
          warehouseId,
          item.productId,
          snList,
          'PURCHASE_ORDER',
          po.id
        );
      }
    }

    // 2. Record Cost (Optional hook to CostService)
    await this.costService.recordPurchaseCost(po.id);

    // 3. Update PO Status
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'received' },
    });
  }
}
