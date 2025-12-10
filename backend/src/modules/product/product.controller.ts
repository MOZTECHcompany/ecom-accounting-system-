import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { CreateBomDto } from './dto/create-bom.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductType } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Request() req, @Body() createProductDto: CreateProductDto) {
    const entityId = req.user.entityId || 'default-entity-id'; // Fallback for dev
    return this.productService.create(entityId, createProductDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('type') type?: ProductType,
    @Query('category') category?: string,
  ) {
    const entityId = req.user.entityId || 'default-entity-id';
    return this.productService.findAll(entityId, { type, category });
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const entityId = req.user.entityId || 'default-entity-id';
    return this.productService.findOne(entityId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    const entityId = req.user.entityId || 'default-entity-id';
    return this.productService.update(entityId, id, updateProductDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    const entityId = req.user.entityId || 'default-entity-id';
    return this.productService.remove(entityId, id);
  }

  // BOM Endpoints
  @Post(':id/bom')
  addBomComponent(
    @Request() req,
    @Param('id') id: string,
    @Body() createBomDto: CreateBomDto,
  ) {
    const entityId = req.user.entityId || 'default-entity-id';
    return this.productService.addBomComponent(entityId, id, createBomDto);
  }

  @Delete(':id/bom/:childId')
  removeBomComponent(
    @Request() req,
    @Param('id') id: string,
    @Param('childId') childId: string,
  ) {
    const entityId = req.user.entityId || 'default-entity-id';
    return this.productService.removeBomComponent(entityId, id, childId);
  }
}
