import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CostService } from '../cost/cost.service';
import { CreateAssemblyOrderDto, AssemblyType } from './dto/create-assembly-order.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class AssemblyService {
  private readonly logger = new Logger(AssemblyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly costService: CostService,
  ) {}

  async create(entityId: string, userId: string, dto: CreateAssemblyOrderDto) {
    // 1. Validate Product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || product.entityId !== entityId) {
      throw new NotFoundException('Product not found');
    }

    if (product.type !== ProductType.BUNDLE && product.type !== ProductType.MANUFACTURED) {
      throw new BadRequestException('Only BUNDLE or MANUFACTURED products can be assembled');
    }

    // 2. Generate Order No
    const orderNo = `ASM-${Date.now()}`;

    // 3. Create Order
    return this.prisma.assemblyOrder.create({
      data: {
        entityId,
        orderNo,
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        type: dto.type,
        status: 'DRAFT',
        createdBy: userId,
        notes: dto.notes,
      },
    });
  }

  async findAll(entityId: string) {
    return this.prisma.assemblyOrder.findMany({
      where: { entityId },
      include: {
        product: true,
        warehouse: true,
        creator: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(entityId: string, id: string) {
    return this.prisma.assemblyOrder.findFirst({
      where: { id, entityId },
      include: {
        product: true,
        warehouse: true,
        creator: true,
      },
    });
  }

  /**
   * Execute Assembly Order
   * 1. Deduct components inventory
   * 2. Add finished good inventory
   * 3. Calculate cost
   */
  async executeOrder(entityId: string, id: string) {
    const order = await this.findOne(entityId, id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DRAFT') throw new BadRequestException('Order is not in DRAFT status');

    const product = order.product;
    const qty = Number(order.quantity);

    // 1. Get BOM
    const bom = await this.prisma.billOfMaterial.findMany({
      where: { parentId: product.id },
      include: { child: true },
    });

    if (bom.length === 0) {
      throw new BadRequestException('Product has no BOM defined');
    }

    // 2. Calculate Total Cost & Deduct Components
    let totalCostBase = 0;

    for (const component of bom) {
      const requiredQty = Number(component.quantity) * qty;
      
      // Deduct Component Stock
      await this.inventoryService.adjustStock({
        entityId,
        warehouseId: order.warehouseId,
        productId: component.childId,
        quantity: -requiredQty, // Negative for deduction
        reason: `Assembly Order: ${order.orderNo}`,
        referenceType: 'ASSEMBLY',
        referenceId: order.id,
      });

      // Calculate Cost Contribution
      // Use Moving Average Cost of component
      const componentCost = Number(component.child.movingAverageCost) || Number(component.child.latestPurchasePrice) || 0;
      totalCostBase += componentCost * requiredQty;
    }

    // 3. Add Finished Good Stock
    await this.inventoryService.adjustStock({
      entityId,
      warehouseId: order.warehouseId,
      productId: product.id,
      quantity: qty,
      reason: `Assembly Order Output: ${order.orderNo}`,
      referenceType: 'ASSEMBLY',
      referenceId: order.id,
    });

    // 4. Update Finished Good Cost (Moving Average)
    // Similar logic to Purchase Cost
    const inventorySnapshots = await this.prisma.inventorySnapshot.findMany({
      where: { productId: product.id },
    });
    const totalQtyOnHand = inventorySnapshots.reduce((sum, snap) => sum + Number(snap.qtyOnHand), 0);
    
    // Note: totalQtyOnHand already includes the new qty because we just called adjustStock above
    const oldQty = totalQtyOnHand - qty;
    const oldCost = Number(product.movingAverageCost);
    const unitCost = totalCostBase / qty;

    let newMovingAvg = unitCost;
    if (oldQty > 0) {
      newMovingAvg = ((oldQty * oldCost) + totalCostBase) / totalQtyOnHand;
    }

    await this.prisma.product.update({
      where: { id: product.id },
      data: {
        movingAverageCost: newMovingAvg,
      },
    });

    // 5. Update Order Status
    return this.prisma.assemblyOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        totalCostBase,
      },
    });
  }
}
