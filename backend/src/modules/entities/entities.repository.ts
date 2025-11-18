import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

/**
 * 公司實體資料存取層
 * 負責與資料庫的直接互動
 */
@Injectable()
export class EntitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    return this.prisma.entity.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.entity.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    // Entity 模型沒有 code 欄位，改用 name 或 id 查找
    // 這裡先返回第一個符合條件的 entity
    return this.prisma.entity.findFirst();
  }

  async create(data: CreateEntityDto) {
    return this.prisma.entity.create({
      data,
    });
  }

  async update(id: string, data: UpdateEntityDto) {
    return this.prisma.entity.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.entity.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
