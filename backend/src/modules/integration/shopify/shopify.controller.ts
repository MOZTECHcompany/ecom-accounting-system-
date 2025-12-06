import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ShopifyService } from './shopify.service';
import { createHmac } from 'crypto';

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

@Controller('integrations/shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get('health')
  async health() {
    return this.shopifyService.testConnection();
  }

  @Post('sync/orders')
  async syncOrders(@Body() body: SyncRequestDto) {
    return this.shopifyService.syncOrders({
      entityId: body.entityId,
      since: body.since ? new Date(body.since) : undefined,
      until: body.until ? new Date(body.until) : undefined,
    });
  }

  @Post('sync/transactions')
  async syncTransactions(@Body() body: SyncRequestDto) {
    return this.shopifyService.syncTransactions({
      entityId: body.entityId,
      since: body.since ? new Date(body.since) : undefined,
      until: body.until ? new Date(body.until) : undefined,
    });
  }

  @Post('webhook')
  async webhook(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Body() payload: any,
  ) {
    const computedHmac = this.computeHmac(JSON.stringify(payload));
    const hmacValid = hmac === computedHmac;
    return this.shopifyService.handleWebhook(topic, payload, hmacValid);
  }

  private computeHmac(rawBody: string) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
    if (!secret) return '';
    return createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  }
}
