import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ShopifyService } from './shopify.service';
import { createHmac } from 'crypto';
import type { Request } from 'express';

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
    @Req() req: Request,
    @Body() payload: any,
  ) {
    const rawBody = (req as any)?.rawBody ? (req as any).rawBody : JSON.stringify(payload);
    const computedHmac = this.computeHmac(rawBody);
    const hmacValid = hmac === computedHmac;
    return this.shopifyService.handleWebhook(topic, payload, hmacValid);
  }

  private computeHmac(rawBody: string) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
    if (!secret) return '';
    return createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  }
}
