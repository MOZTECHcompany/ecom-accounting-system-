import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * SalesService
 * 銷售服務基礎類別
 */
@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
