import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { CreateBomDto } from './dto/create-bom.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(entityId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: {
        entityId_sku: {
          entityId,
          sku: dto.sku,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Product with SKU ${dto.sku} already exists`);
    }

    return this.prisma.product.create({
      data: {
        entityId,
        ...dto,
      },
    });
  }

  async findAll(entityId: string, query?: { type?: ProductType; category?: string }) {
    return this.prisma.product.findMany({
      where: {
        entityId,
        type: query?.type,
        category: query?.category,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(entityId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, entityId },
      include: {
        bomChildren: {
          include: {
            child: true,
          },
        },
        bomParent: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(entityId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(entityId, id); // Ensure exists

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(entityId: string, id: string) {
    await this.findOne(entityId, id); // Ensure exists
    return this.prisma.product.delete({ where: { id } });
  }

  // BOM Management
  async addBomComponent(entityId: string, parentId: string, dto: CreateBomDto) {
    const parent = await this.findOne(entityId, parentId);
    
    if (parent.type === ProductType.SIMPLE) {
      throw new ConflictException('Cannot add BOM to a SIMPLE product. Change type to BUNDLE or MANUFACTURED first.');
    }

    const child = await this.prisma.product.findUnique({
      where: {
        entityId_sku: {
          entityId,
          sku: dto.childSku,
        },
      },
    });

    if (!child) {
      throw new NotFoundException(`Child product with SKU ${dto.childSku} not found`);
    }

    if (parent.id === child.id) {
      throw new ConflictException('Cannot add product as its own component');
    }

    // Check if already exists
    const existingBom = await this.prisma.billOfMaterial.findUnique({
      where: {
        parentId_childId: {
          parentId,
          childId: child.id,
        },
      },
    });

    if (existingBom) {
      return this.prisma.billOfMaterial.update({
        where: { id: existingBom.id },
        data: {
          quantity: dto.quantity,
          notes: dto.notes,
        },
      });
    }

    return this.prisma.billOfMaterial.create({
      data: {
        entityId,
        parentId,
        childId: child.id,
        quantity: dto.quantity,
        notes: dto.notes,
      },
    });
  }

  async removeBomComponent(entityId: string, parentId: string, childId: string) {
    // Verify ownership
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: {
        entityId,
        parentId,
        childId,
      },
    });

    if (!bom) {
      throw new NotFoundException('BOM component not found');
    }

    return this.prisma.billOfMaterial.delete({
      where: { id: bom.id },
    });
  }
}
