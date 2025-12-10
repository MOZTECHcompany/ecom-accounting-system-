import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(entityId: string) {
    return this.prisma.customer.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(entityId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, entityId },
    });
  }

  async create(entityId: string, data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({
      data: {
        ...data,
        entity: { connect: { id: entityId } },
      },
    });
  }

  async update(entityId: string, id: string, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(entityId: string, id: string) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
