import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RequireEntityAccess } from '../../../common/decorators/entity-access.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EntityAccessGuard } from '../../../common/guards/entity-access.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AfterSalesLegacyAdapter } from './after-sales-legacy.adapter';
import { AfterSalesMigrationService } from './after-sales-migration.service';

class LegacyCaseListQueryDto {
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsDateString()
  updatedAfter?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: 'true' | 'false';
}

class EntityQueryDto {
  @IsString()
  @IsNotEmpty()
  entityId!: string;
}

class MigrationPageDto {
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsDateString()
  updatedAfter?: string;
}

@ApiTags('After Sales')
@ApiBearerAuth()
@Controller('after-sales')
@UseGuards(JwtAuthGuard, RolesGuard, EntityAccessGuard)
@RequireEntityAccess('sales')
@Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'CUSTOMER_SERVICE', 'OPERATOR')
export class AfterSalesController {
  constructor(
    private readonly legacyAdapter: AfterSalesLegacyAdapter,
    private readonly migrationService: AfterSalesMigrationService,
  ) {}

  @Get('readiness')
  @ApiOperation({ summary: '檢查售後舊系統唯讀連線' })
  readiness(@Query() query: EntityQueryDto) {
    void query.entityId;
    return this.legacyAdapter.getReadiness();
  }

  @Get('legacy/cases')
  @ApiOperation({ summary: '讀取售後舊系統案件清單' })
  listLegacyCases(@Query() query: LegacyCaseListQueryDto) {
    return this.legacyAdapter.listCases({
      limit: query.limit,
      cursor: query.cursor,
      updatedAfter: query.updatedAfter,
      includeDeleted: query.includeDeleted === 'true',
    });
  }

  @Get('legacy/cases/:id')
  @ApiOperation({ summary: '讀取售後舊系統案件完整資料' })
  getLegacyCase(@Param('id') id: string, @Query() query: EntityQueryDto) {
    void query.entityId;
    return this.legacyAdapter.getCase(id);
  }

  @Get('migration/preview/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '預覽單筆售後案件遷移結果（不寫入）' })
  previewMigration(@Param('id') id: string, @Query() query: EntityQueryDto) {
    void query.entityId;
    return this.migrationService.previewCase(id);
  }

  @Get('migration/preview-page')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '預覽一頁售後案件遷移結果（不寫入）' })
  previewMigrationPage(@Query() query: MigrationPageDto) {
    return this.migrationService.previewPage(query);
  }

  @Post('migration/stage-page')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: '寫入一頁售後遷移 staging（不寫正式售後資料）' })
  stageMigrationPage(@Body() body: MigrationPageDto) {
    return this.migrationService.stagePage(body.entityId, body);
  }
}
