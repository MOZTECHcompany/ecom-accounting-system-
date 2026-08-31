import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  buildSalesOrderSourceKey,
  canonicalSalesOrderWhere,
} from '../integration/sales-order-integrity';

@Injectable()
export class SalesRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(skip?: number, take?: number) {
    return this.prisma.salesOrder.findMany({
      where: canonicalSalesOrderWhere({}),
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.salesOrder.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    return this.prisma.salesOrder.create({
      data: {
        ...data,
        sourceOrderKey: data.externalOrderId
          ? buildSalesOrderSourceKey(data.channelId, data.externalOrderId)
          : undefined,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.salesOrder.update({
      where: { id },
      data,
    });
  }
}
