import { ForbiddenException } from '@nestjs/common';
import { EntityAccessService } from './entity-access.service';

describe('EntityAccessService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    entity: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  let service: EntityAccessService;

  const user = (overrides: Record<string, unknown> = {}) => ({
    employeeDataScope: 'ENTITY',
    attendanceDataScope: 'ENTITY',
    payrollDataScope: 'ENTITY',
    accountingDataScope: 'ENTITY',
    inventoryDataScope: 'ENTITY',
    salesDataScope: 'ENTITY',
    purchasingDataScope: 'ENTITY',
    bankingDataScope: 'ENTITY',
    employee: {
      id: 'employee-1',
      entityId: 'entity-1',
      departmentId: 'department-1',
    },
    roles: [{ role: { code: 'ADMIN', name: 'ADMIN' } }],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EntityAccessService(prisma as any);
  });

  it('allows a super admin to select another existing entity', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({ roles: [{ role: { code: 'SUPER_ADMIN', name: 'SUPER_ADMIN' } }] }),
    );
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-2' });

    const context = await service.assertAccess(
      'user-1',
      'accounting',
      'entity-2',
    );

    expect(context.isSuperAdmin).toBe(true);
    expect(context.entityId).toBe('entity-2');
  });

  it('allows a linked user to access only their own entity', async () => {
    prisma.user.findUnique.mockResolvedValue(user());

    await expect(
      service.assertAccess('user-1', 'accounting', 'entity-1'),
    ).resolves.toMatchObject({ entityId: 'entity-1', noAccess: false });
    await expect(
      service.assertAccess('user-1', 'accounting', 'entity-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed for a non-super-admin without an employee link', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ employee: null }));

    await expect(
      service.assertAccess('user-1', 'accounting', 'entity-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getAccessibleEntityIds('user-1')).resolves.toEqual([]);
  });

  it('requires a department anchor for department-scoped access', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({
        accountingDataScope: 'DEPARTMENT',
        employee: {
          id: 'employee-1',
          entityId: 'entity-1',
          departmentId: null,
        },
      }),
    );

    await expect(
      service.assertAccess('user-1', 'accounting', 'entity-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
