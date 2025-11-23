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

  async findActiveReimbursementItems(entityId: string, options?: { roles?: string[]; departmentId?: string }) {
    const { roles, departmentId } = options || {};

    return this.prisma.reimbursementItem.findMany({
      where: {
        entityId,
        isActive: true,
        AND: [
          roles && roles.length
            ? {
                OR: [
                  { allowedRoles: null },
                  { allowedRoles: '' },
                  ...roles.map((role) => ({ allowedRoles: { contains: role } })),
                ],
              }
            : {},
          departmentId
            ? {
                OR: [
                  { allowedDepartments: null },
                  { allowedDepartments: '' },
                  { allowedDepartments: { contains: departmentId } },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
    });
  }
}
