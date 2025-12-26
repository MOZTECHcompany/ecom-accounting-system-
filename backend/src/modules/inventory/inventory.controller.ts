import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('warehouses')
  @ApiOperation({ summary: '查詢倉庫列表' })
  getWarehouses(@Query('entityId') entityId: string) {
    return this.inventoryService.getWarehouses(entityId);
  }

  @Post('warehouses')
  @ApiOperation({ summary: '建立倉庫（多倉）' })
  createWarehouse(@Body() body: any) {
    return this.inventoryService.createWarehouse(body);
  }

  @Get('snapshots')
  @ApiOperation({ summary: '取得指定商品在各倉庫的庫存快照' })
  getSnapshots(
    @Query('entityId') entityId: string,
    @Query('productId') productId: string,
  ) {
    return this.inventoryService.getSnapshotsForProduct(entityId, productId);
  }

  @Post('adjust')
  @ApiOperation({ summary: '通用庫存異動（入庫/出庫/調整）' })
  adjustStock(@Body() body: any) {
    return this.inventoryService.adjustStock(body);
  }

  @Post('reserve')
  @ApiOperation({ summary: '預留庫存（銷售訂單建立時）' })
  reserveStock(@Body() body: any) {
    return this.inventoryService.reserveStock(body);
  }

  @Post('release')
  @ApiOperation({ summary: '釋放預留庫存（訂單取消或調整）' })
  releaseReserved(@Body() body: any) {
    return this.inventoryService.releaseReservedStock(body);
  }

  @Post('import/erp')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '批次匯入舊 ERP 庫存（Excel）' })
  importErpInventory(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('entityId') entityId?: string,
    @Query('sheet') sheet?: string,
    @Query('dryRun') dryRun?: string,
    @Query('force') force?: string,
  ) {
    const resolvedEntityId =
      (entityId || '').trim() || req.user?.entityId || 'default-entity-id';

    return this.inventoryService.importLegacyErpInventory({
      entityId: resolvedEntityId,
      file,
      sheet,
      dryRun: String(dryRun || '').toLowerCase() === 'true',
      force: String(force || '').toLowerCase() === 'true',
    });
  }
}
