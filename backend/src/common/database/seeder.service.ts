import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Checking database seed status...');
    await this.seed();
  }

  async seed() {
    try {
      // 1. Create Entities
      await this.createEntities();

      // 2. Create Roles and Permissions
      const adminRole = await this.createRolesAndPermissions();

      // 3. Create Admin User
      await this.createAdminUser(adminRole);

      this.logger.log('✅ Database seeding completed successfully.');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error);
    }
  }

  private async createEntities() {
    await this.prisma.entity.upsert({
      where: { id: 'tw-entity-001' },
      update: {},
      create: {
        id: 'tw-entity-001',
        name: '台灣公司',
        country: 'TW',
        baseCurrency: 'TWD',
        taxId: '12345678',
        address: '台北市信義區信義路五段7號',
        contactEmail: 'taiwan@company.com',
        contactPhone: '+886-2-2345-6789',
      },
    });

    await this.prisma.entity.upsert({
      where: { id: 'cn-entity-001' },
      update: {},
      create: {
        id: 'cn-entity-001',
        name: '大陸公司',
        country: 'CN',
        baseCurrency: 'CNY',
        taxId: '91110000000000000X',
        address: '上海市浦東新區陸家嘴環路1000號',
        contactEmail: 'china@company.com',
        contactPhone: '+86-21-1234-5678',
      },
    });
  }

  private async createRolesAndPermissions() {
    // Create Permissions (Simplified for critical ones)
    const resources = ['users', 'accounts', 'journal_entries', 'sales_orders'];
    const actions = ['read', 'create', 'update', 'delete', 'approve'];
    
    const permissions = [];
    for (const resource of resources) {
      for (const action of actions) {
        const permission = await this.prisma.permission.upsert({
          where: { resource_action: { resource, action } },
          update: {},
          create: {
            resource,
            action,
            description: `${action} ${resource}`,
          },
        });
        permissions.push(permission);
      }
    }

    // Create Roles
    const adminRole = await this.prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: '系統最高管理員，擁有所有權限',
      },
    });

    await this.prisma.role.upsert({
      where: { name: 'ACCOUNTANT' },
      update: {},
      create: {
        name: 'ACCOUNTANT',
        description: '會計人員',
      },
    });

    await this.prisma.role.upsert({
      where: { name: 'OPERATOR' },
      update: {},
      create: {
        name: 'OPERATOR',
        description: '一般操作人員',
      },
    });

    // Assign permissions to ADMIN
    for (const permission of permissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }

    return adminRole;
  }

  private async createAdminUser(adminRole: any) {
    const email = 's7896629@gmail.com';
    const password = '@asdf798522';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        passwordHash, // Ensure password is updated
      },
      create: {
        email,
        name: '系統管理員',
        passwordHash,
      },
    });

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    this.logger.log(`Admin user ensured: ${email}`);
  }
}
