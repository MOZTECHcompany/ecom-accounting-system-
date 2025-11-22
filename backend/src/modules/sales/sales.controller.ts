import {
  Controller,
  Get,
  Post,
  Body,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SalesService } from './sales.service';
import { SalesOrderService } from './services/sales-order.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';

@ApiTags('sales')
 * SalesController
 * 銷售控制器
 */
@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly salesOrderService: SalesOrderService,
  ) {}

  /**
   * 查詢銷售渠道
   */
  @Get('channels')
  @ApiOperation({ summary: '查詢銷售渠道' })
  @ApiQuery({ name: 'entityId', required: true })
  async getSalesChannels(@Query('entityId', ParseUUIDPipe) entityId: string) {
    return this.salesService.getSalesChannels(entityId);
  }

  /**
   * 查詢銷售訂單
   */
  @Get('orders')
  @ApiOperation({ summary: '查詢銷售訂單' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({ name: 'channelId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getSalesOrders(
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('channelId') channelId?: string,
    @Query('status') status?: string,
  ) {
    return this.salesOrderService.getSalesOrders(entityId, {
      channelId,
      status,
    });
  }

  /**
   * 建立銷售訂單
   */
  @Post('orders')
  @ApiOperation({ summary: '建立銷售訂單' })
  async createSalesOrder(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrderService.createSalesOrder(dto, userId);
  }

  /**
   * 完成訂單（產生會計分錄）
   */
  @Post('orders/:id/complete')
  @ApiOperation({ summary: '完成訂單並產生會計分錄' })
  async completeSalesOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrderService.completeSalesOrder(orderId, userId);
  }

  /**
   * 建立模擬訂單（用於測試）
   */
  @Post('orders/mock')
  @ApiOperation({ summary: '建立模擬訂單用於測試系統流程' })
  @ApiQuery({ name: 'entityId', required: true, description: '公司實體ID' })
  async createMockOrder(
    @Query('entityId', ParseUUIDPipe) entityId: string,

  @Post('orders/:id/fulfill')
  @ApiOperation({ summary: '銷售訂單出貨並自動更新庫存' })
  async fulfillOrder(
    @Query('entityId') entityId: string,
    @Query('warehouseId') warehouseId: string,
    @Query('salesOrderId') salesOrderId: string,
  ) {
    return this.salesService.fulfillSalesOrder({ entityId, warehouseId, salesOrderId });
  }
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrderService.createMockOrder(entityId, userId);
  }
}
