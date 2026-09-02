import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireEntityAccess } from '../../common/decorators/entity-access.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { EntityAccessGuard } from '../../common/guards/entity-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  IngestInvoiceSourceRecordsDto,
  UpsertInvoiceSourceDto,
} from './dto/invoice-source.dto';
import { InvoiceSyncService } from './invoice-sync.service';

@ApiTags('invoice-sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EntityAccessGuard)
@RequireEntityAccess('accounting')
@Controller('invoice-sync')
export class InvoiceSyncController {
  constructor(private readonly invoiceSyncService: InvoiceSyncService) {}

  @Get('sources')
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: '列出公司發票同步來源（不回傳密鑰）' })
  listSources(@Query('entityId') entityId?: string) {
    return this.invoiceSyncService.listSources(this.requireEntityId(entityId));
  }

  @Get('readiness')
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: '只讀檢查進項／銷項發票同步準備度' })
  getReadiness(@Query('entityId') entityId?: string) {
    return this.invoiceSyncService.getReadiness(
      this.requireEntityId(entityId),
    );
  }

  @Post('sources')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '登錄發票來源與公司歸屬（不接受密鑰）' })
  upsertSource(@Body() dto: UpsertInvoiceSourceDto) {
    return this.invoiceSyncService.upsertSource(dto);
  }

  @Post('sources/:sourceId/records')
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: '將外部發票證據寫入待核對層，不直接入帳' })
  ingestSourceRecords(
    @Param('sourceId') sourceId: string,
    @Body() dto: IngestInvoiceSourceRecordsDto,
  ) {
    return this.invoiceSyncService.ingestSourceRecords(sourceId, dto);
  }

  @Get('records')
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: '查詢標準化發票候選與來源證據' })
  listRecords(
    @Query('entityId') entityId?: string,
    @Query('direction') direction?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    if (limit && !Number.isFinite(parsedLimit)) {
      throw new BadRequestException('limit must be a number');
    }
    return this.invoiceSyncService.listRecords({
      entityId: this.requireEntityId(entityId),
      direction: direction?.trim() || undefined,
      status: status?.trim() || undefined,
      limit: parsedLimit,
    });
  }

  private requireEntityId(entityId?: string) {
    const normalized = entityId?.trim();
    if (!normalized) throw new BadRequestException('entityId is required');
    return normalized;
  }
}
