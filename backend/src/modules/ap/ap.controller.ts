import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApService } from './ap.service';

/**
 * 應付帳款控制器
 */
@ApiTags('ap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ap')
export class ApController {
  constructor(private readonly apService: ApService) {}

  @Get('invoices')
  @ApiOperation({ summary: '查詢應付帳款發票列表' })
  async getInvoices(@Query('entityId') entityId?: string) {
    return this.apService.getInvoices(entityId);
  }

  @Post('invoices')
  @ApiOperation({ summary: '建立AP發票' })
  async createInvoice(@Body() data: any) {
    return this.apService.createInvoice(data);
  }

  @Post('invoices/:id/pay')
  @ApiOperation({ summary: '記錄付款' })
  async recordPayment(@Param('id') id: string, @Body() data: any) {
    return this.apService.recordPayment(id, data);
  }

  @Get('due-report')
  @ApiOperation({ summary: '到期應付款報表' })
  async getDueReport(@Query('entityId') entityId: string) {
    return this.apService.getDuePayablesReport(entityId);
  }
}
