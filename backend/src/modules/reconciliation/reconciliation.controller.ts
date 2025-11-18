import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReconciliationService } from './reconciliation.service';
import { ImportBankTransactionsDto } from './dto/import-bank-transactions.dto';
import { AutoMatchDto } from './dto/auto-match.dto';

/**
 * ReconciliationController
 * 
 * 銀行對帳控制器
 */
@ApiTags('Reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
  ) {}

  /**
   * 匯入銀行明細
   */
  @Post('bank/import')
  @ApiOperation({
    summary: '匯入銀行交易明細',
    description:
      '上傳銀行明細（JSON格式），系統會解析並儲存至資料庫。未來支援CSV上傳。',
  })
  async importBankTransactions(
    @Body() dto: ImportBankTransactionsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.importBankTransactions(dto, userId);
  }

  /**
   * 自動對帳
   */
  @Post('bank/auto-match')
  @ApiOperation({
    summary: '自動比對銀行交易與會計記錄',
    description:
      '根據金額、日期、虛擬帳號等條件，自動匹配銀行交易與會計分錄。支援精準與模糊匹配。',
  })
  async autoMatchBankTransactions(
    @Body() dto: AutoMatchDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.autoMatchBankTransactions(dto, userId);
  }

  /**
   * 查詢待對帳項目
   */
  @Get('bank/pending')
  @ApiOperation({
    summary: '查詢尚未對帳的銀行交易',
    description: '列出所有待對帳的銀行交易，並提供建議匹配項目。',
  })
  @ApiQuery({ name: 'bankAccountId', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  async getPendingItems(
    @Query('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.reconciliationService.getPendingItems(
      bankAccountId,
      entityId,
    );
  }

  /**
   * 手動確認匹配
   */
  @Post('bank/manual-match')
  @ApiOperation({
    summary: '手動確認銀行交易與分錄的匹配',
    description: '當自動對帳無法確定時，由使用者手動確認配對。',
  })
  async manualMatch(
    @Body('bankTransactionId') bankTransactionId: string,
    @Body('journalEntryId') journalEntryId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.manualMatch(
      bankTransactionId,
      journalEntryId,
      userId,
    );
  }

  /**
   * 取消匹配
   */
  @Post('bank/unmatch')
  @ApiOperation({
    summary: '取消已對帳的匹配',
    description: '若發現對帳錯誤，可取消匹配並重新對帳。',
  })
  async unmatch(
    @Body('bankTransactionId') bankTransactionId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.unmatch(
      bankTransactionId,
      reason,
      userId,
    );
  }
}
