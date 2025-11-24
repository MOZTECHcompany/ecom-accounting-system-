import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BankingService } from './banking.service';

/**
 * 銀行帳戶控制器
 * 管理銀行帳戶、交易記錄、對帳作業
 */
@ApiTags('banking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Get('accounts')
  @ApiOperation({ summary: '查詢銀行帳戶列表' })
  @ApiResponse({ status: 200, description: '成功取得銀行帳戶列表' })
  async getBankAccounts(@Query('entityId') entityId?: string) {
    return this.bankingService.getBankAccounts(entityId || '');
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: '查詢單一銀行帳戶' })
  @ApiResponse({ status: 200, description: '成功取得銀行帳戶詳情' })
  async getBankAccount(@Param('id') id: string) {
    throw new Error('Not implemented');
  }

  @Post('accounts')
  @ApiOperation({ summary: '建立銀行帳戶' })
  @ApiResponse({ status: 201, description: '成功建立銀行帳戶' })
  async createBankAccount(@Body() data: any) {
    return this.bankingService.createBankAccount(data);
  }

  @Get('transactions')
  @ApiOperation({ summary: '查詢銀行交易記錄' })
  @ApiResponse({ status: 200, description: '成功取得交易記錄' })
  async getTransactions(
    @Query('bankAccountId') bankAccountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bankingService.getBankTransactions(
      bankAccountId || '',
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('transactions')
  @ApiOperation({ summary: '建立銀行交易' })
  @ApiResponse({ status: 201, description: '成功建立交易記錄' })
  async createTransaction(@Body() data: any) {
    throw new Error('Not implemented');
  }

  @Put('transactions/:id/reconcile')
  @ApiOperation({ summary: '更新對帳狀態' })
  @ApiResponse({ status: 200, description: '成功更新對帳狀態' })
  async updateReconciliation(@Param('id') id: string, @Body() data: any) {
    throw new Error('Not implemented');
  }

  @Get('accounts/:id/balance')
  @ApiOperation({ summary: '查詢帳戶餘額' })
  @ApiResponse({ status: 200, description: '成功取得帳戶餘額' })
  async getAccountBalance(@Param('id') id: string) {
    throw new Error('Not implemented');
  }
}
