import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBatches(filters: any) {
    return this.prisma.productBatch.findMany({
      where: filters,
      include: { product: true, purchaseOrder: true },
    });
  }

  async createDevCost(data: any) {
    return this.prisma.devCost.create({ data });
  }

  async findDevCosts(productId: string) {
    return this.prisma.devCost.findMany({
      where: { productId },
    });
  }
}
