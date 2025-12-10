import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Prisma } from '@prisma/client';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Request() req, @Body() data: Prisma.CustomerCreateInput) {
    return this.customerService.create(req.user.entityId, data);
  }

  @Get()
  findAll(@Request() req) {
    return this.customerService.findAll(req.user.entityId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.customerService.findOne(req.user.entityId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() data: Prisma.CustomerUpdateInput) {
    return this.customerService.update(req.user.entityId, id, data);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.customerService.remove(req.user.entityId, id);
  }
}
