import { Body, Controller, Get, Headers, Post, Query, RawBody } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../../../common/decorators/public.decorator';
import { ShopifyService } from './shopify.service';

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

  @Get('summary')
  async summary(@Query() query: SummaryQueryDto) {
    return this.shopifyService.getSummary({
      entityId: query.entityId,
      since: query.since ? new Date(query.since) : undefined,
      until: query.until ? new Date(query.until) : undefined,
    });
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @RawBody() rawBody: Buffer | undefined,
    @Body() payload: any,
  ) {
    const rawPayload = rawBody?.toString('utf8') || JSON.stringify(payload);
    const hmacValid = this.isValidHmac(rawPayload, hmac);
    return this.shopifyService.handleWebhook(topic, payload, hmacValid);
  }

  private computeHmac(rawBody: string) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
    if (!secret) return '';
    return createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  }

  private isValidHmac(rawBody: string, providedHmac?: string) {
    const computedHmac = this.computeHmac(rawBody);
    if (!providedHmac || !computedHmac) {
      return false;
    }

    const expected = Buffer.from(computedHmac, 'utf8');
    const received = Buffer.from(providedHmac, 'utf8');

    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }
}
