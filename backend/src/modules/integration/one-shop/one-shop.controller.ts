import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { OneShopService } from './one-shop.service';
import { Public } from '../../../common/decorators/public.decorator';

class SyncRequestDto {
  @IsString()
  entityId!: string;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}

class SummaryQueryDto {
  @IsString()
  entityId!: string;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}

@Controller('integrations/1shop')
export class OneShopController {
  constructor(private readonly oneShopService: OneShopService) {}

  @Get('health')
  async health() {
    return this.oneShopService.testConnection();
  }

  @Get('connection-info')
  async connectionInfo() {
    return this.oneShopService.getConnectionInfo();
  }

  @Post('sync/orders')
  async syncOrders(@Body() body: SyncRequestDto) {
    return this.oneShopService.syncOrders({
      entityId: body.entityId,
      since: body.since ? new Date(body.since) : undefined,
      until: body.until ? new Date(body.until) : undefined,
    });
  }

  @Post('sync/transactions')
  async syncTransactions(@Body() body: SyncRequestDto) {
    return this.oneShopService.syncTransactions({
      entityId: body.entityId,
      since: body.since ? new Date(body.since) : undefined,
      until: body.until ? new Date(body.until) : undefined,
    });
  }

  @Public()
  @Post('sync/auto')
  async autoSync(
    @Headers('x-sync-token') syncToken: string | undefined,
    @Body() body: Partial<SyncRequestDto>,
  ) {
    this.oneShopService.assertSchedulerToken(syncToken);

    return this.oneShopService.autoSync({
      entityId: body.entityId,
      since: body.since ? new Date(body.since) : undefined,
      until: body.until ? new Date(body.until) : undefined,
    });
  }

  @Get('summary')
  async summary(@Query() query: SummaryQueryDto) {
    return this.oneShopService.getSummary({
      entityId: query.entityId,
      since: query.since ? new Date(query.since) : undefined,
      until: query.until ? new Date(query.until) : undefined,
    });
  }
}
