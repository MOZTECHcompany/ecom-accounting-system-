import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: any) {
    return this.prisma.expenseRequest.findMany({
      where: filters,
      include: { creator: true, approver: true },
    });
  }

  async create(data: any) {
    return this.prisma.expenseRequest.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.expenseRequest.update({ where: { id }, data });
  }
}
