import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.VendorCreateInput) {
    return this.prisma.vendor.create({ data });
  }

  async findAll(entityId?: string) {
    const where: Prisma.VendorWhereInput = entityId ? { entityId } : {};
    return this.prisma.vendor.findMany({ 
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }

  async update(id: string, data: Prisma.VendorUpdateInput) {
    await this.findOne(id); // Ensure exists
    return this.prisma.vendor.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    return this.prisma.vendor.delete({ where: { id } });
  }
}
