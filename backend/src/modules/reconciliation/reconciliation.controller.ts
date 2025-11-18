import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { ImportBankTransactionsDto } from './dto/import-bank-transactions.dto';
import { AutoMatchDto } from './dto/auto-match.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('bank/import')
  @Roles('ADMIN')
  @ApiOperation({ summary: '匯入銀行交易明細', description: '從 CSV/JSON 匯入銀行交易資料' })
  @ApiResponse({ status: 201, description: '匯入成功' })
  async importBankTransactions(@Body() dto: ImportBankTransactionsDto, @CurrentUser() user: any) {
    return this.reconciliationService.importBankTransactions(dto, user.userId);
  }

  @Post('bank/auto-match/:batchId')
  @Roles('ADMIN')
  @ApiOperation({ summary: '自動對帳', description: '對指定批次的銀行交易進行自動匹配' })
  @ApiResponse({ status: 200, description: '對帳完成' })
  async autoMatchBankTransactions(@Param('batchId') batchId: string, @Body() config?: AutoMatchDto) {
    return this.reconciliationService.autoMatchTransactions(batchId, config);
  }

  @Get('pending')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: '查詢待對帳項目', description: '取得所有未匹配的銀行交易' })
  @ApiResponse({ status: 200, description: '待對帳項目列表' })
  async getPendingItems(@Query('entityId') entityId: string) {
    return this.reconciliationService.getPendingReconciliation(entityId);
  }

  @Post('bank/manual-match')
  @Roles('ADMIN')
  @ApiOperation({ summary: '手動對帳', description: '手動指定銀行交易與業務單據的匹配關係' })
  @ApiResponse({ status: 200, description: '對帳成功' })
  async manualMatch(
    @Body() body: { bankTransactionId: string; matchedType: string; matchedId: string },
    @CurrentUser() user: any,
  ) {
    return this.reconciliationService.manualMatch(
      body.bankTransactionId,
      body.matchedType,
      body.matchedId,
      user.userId,
    );
  }

  @Post('bank/unmatch')
  @Roles('ADMIN')
  @ApiOperation({ summary: '取消對帳', description: '取消已匹配的銀行交易' })
  @ApiResponse({ status: 200, description: '取消成功' })
  async unmatch(@Body() body: { bankTransactionId: string }, @CurrentUser() user: any) {
    return this.reconciliationService.unmatch(body.bankTransactionId, user.userId);
  }
}
