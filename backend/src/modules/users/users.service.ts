import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * UsersService
 * 使用者服務，處理使用者相關的資料庫操作
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根據 Email 查詢使用者
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 根據 ID 查詢使用者
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * 建立新使用者
   */
  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * 取得使用者的所有權限
   */
  async getUserPermissions(userId: string) {
    const user = await this.findById(userId);

    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => ({
        resource: rolePermission.permission.resource,
        action: rolePermission.permission.action,
      })),
    );

    return permissions;
  }

  /**
   * 檢查使用者是否擁有特定權限
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(
      (p) => p.resource === resource && p.action === action,
    );
  }

  /**
   * 為使用者指派角色
   */
  async assignRole(userId: string, roleId: string) {
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }
}
