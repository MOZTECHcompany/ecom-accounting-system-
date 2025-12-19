import { Controller, Get, Post, Body, Param, Put, UseGuards, Request } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @Roles('ADMIN', 'OPERATOR')
  create(@Request() req, @Body() dto: CreatePurchaseOrderDto) {
    // Assuming entityId is available in req.user (set by JwtStrategy)
    // For now, we might need to pass it or extract it. 
    // Let's assume req.user.entityId exists.
    return this.purchaseService.create(req.user.entityId, dto);
  }

  @Get()
  @Roles('ADMIN', 'ACCOUNTANT', 'OPERATOR')
  findAll(@Request() req) {
    return this.purchaseService.findAll(req.user.entityId);
  }

  @Get(':id')
  @Roles('ADMIN', 'ACCOUNTANT', 'OPERATOR')
  findOne(@Request() req, @Param('id') id: string) {
    return this.purchaseService.findOne(req.user.entityId, id);
  }

  @Put(':id/receive')
  @Roles('ADMIN', 'OPERATOR')
  receive(@Request() req, @Param('id') id: string, @Body() dto: ReceivePurchaseOrderDto) {
    return this.purchaseService.receiveOrder(req.user.entityId, id, dto);
  }
}
