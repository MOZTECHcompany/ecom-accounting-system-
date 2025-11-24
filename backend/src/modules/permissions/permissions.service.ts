import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async findById(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async create(dto: CreatePermissionDto) {
    try {
      const permission = await this.prisma.permission.create({
        data: {
          resource: dto.resource,
          action: dto.action,
          description: dto.description,
        },
      });

      this.logger.log(`Created permission ${dto.resource}:${dto.action}`);
      return permission;
    } catch (error) {
      this.handlePrismaError(
        error,
        `create permission ${dto.resource}:${dto.action}`,
      );
    }
  }

  async update(id: string, dto: UpdatePermissionDto) {
    try {
      const permission = await this.prisma.permission.update({
        where: { id },
        data: {
          resource: dto.resource ?? undefined,
          action: dto.action ?? undefined,
          description: dto.description ?? undefined,
        },
      });

      this.logger.log(`Updated permission ${id}`);
      return permission;
    } catch (error) {
      this.handlePrismaError(error, `update permission ${id}`);
    }
  }

  async remove(id: string) {
    try {
      const permission = await this.prisma.permission.delete({ where: { id } });
      this.logger.log(`Deleted permission ${id}`);
      return permission;
    } catch (error) {
      this.handlePrismaError(error, `delete permission ${id}`);
    }
  }

  private handlePrismaError(error: unknown, context: string): never {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `Duplicate value detected while trying to ${context}`,
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Record not found while trying to ${context}`,
        );
      }
    }

    const err = error as Error;
    this.logger.error(`Unhandled error while trying to ${context}`, err?.stack);
    throw error;
  }
}
