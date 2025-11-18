import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountingService } from './accounting.service';
import { ReportService } from './services/report.service';

/**
 * AccountingController
 * 會計控制器，提供會計科目與報表查詢的 API
 */
@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
@UseGuards(JwtAuthGuard)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly reportService: ReportService,
  ) {}

  /**
   * 取得會計科目表
   */
  @Get('accounts')
  @ApiOperation({ summary: '查詢會計科目表' })
  @ApiQuery({ name: 'entityId', required: true, description: '公司實體 ID' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '科目類型 (asset/liability/equity/revenue/expense)',
  })
  async getAccounts(
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('type') type?: string,
  ) {
    return this.accountingService.getAccountsByEntity(entityId, type);
  }

  /**
   * 取得會計期間
   */
  @Get('periods')
  @ApiOperation({ summary: '查詢會計期間' })
  @ApiQuery({ name: 'entityId', required: true, description: '公司實體 ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '期間狀態 (open/closed/locked)',
  })
  async getPeriods(
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('status') status?: string,
  ) {
    return this.accountingService.getPeriods(entityId, status);
  }

  /**
   * 產生損益表
   */
  @Get('reports/income-statement')
  @ApiOperation({ summary: '產生損益表' })
  @ApiQuery({ name: 'entityId', required: true, description: '公司實體 ID' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: '開始日期 (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: '結束日期 (YYYY-MM-DD)',
  })
  async getIncomeStatement(
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getIncomeStatement(
      entityId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * 產生資產負債表
   */
  @Get('reports/balance-sheet')
  @ApiOperation({ summary: '產生資產負債表' })
  @ApiQuery({ name: 'entityId', required: true, description: '公司實體 ID' })
  @ApiQuery({
    name: 'asOfDate',
    required: true,
    description: '截止日期 (YYYY-MM-DD)',
  })
  async getBalanceSheet(
    @Query('entityId', ParseUUIDPipe) entityId: string,
    @Query('asOfDate') asOfDate: string,
  ) {
    return this.reportService.getBalanceSheet(entityId, new Date(asOfDate));
  }
}
