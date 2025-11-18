import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

/**
 * 報表控制器
 * 產生各類財務報表：損益表、資產負債表、現金流量表等
 */
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income-statement')
  @ApiOperation({ summary: '產生損益表 (Income Statement / P&L)' })
  @ApiResponse({ status: 200, description: '成功產生損益表' })
  @ApiQuery({ name: 'entityId', required: true, description: '實體ID' })
  @ApiQuery({ name: 'startDate', required: true, description: '開始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: '結束日期 (YYYY-MM-DD)' })
  async getIncomeStatement(
    @Query('entityId') entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getIncomeStatement(entityId, new Date(startDate), new Date(endDate));
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: '產生資產負債表 (Balance Sheet)' })
  @ApiResponse({ status: 200, description: '成功產生資產負債表' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({ name: 'asOfDate', required: true, description: '截止日期 (YYYY-MM-DD)' })
  async getBalanceSheet(
    @Query('entityId') entityId: string,
    @Query('asOfDate') asOfDate: string,
  ) {
    return this.reportsService.getBalanceSheet(entityId, new Date(asOfDate));
  }

  @Get('cash-flow')
  @ApiOperation({ summary: '產生現金流量表 (Cash Flow Statement)' })
  @ApiResponse({ status: 200, description: '成功產生現金流量表' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getCashFlow(
    @Query('entityId') entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getCashFlowStatement(entityId, new Date(startDate), new Date(endDate));
  }

  @Get('trial-balance')
  @ApiOperation({ summary: '產生試算表 (Trial Balance)' })
  @ApiResponse({ status: 200, description: '成功產生試算表' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({ name: 'periodId', required: true, description: '會計期間ID' })
  async getTrialBalance(
    @Query('entityId') entityId: string,
    @Query('periodId') periodId: string,
  ) {
    // TODO: Implement trial balance
    return { message: 'Trial balance not yet implemented', entityId, periodId };
  }

  @Get('general-ledger')
  @ApiOperation({ summary: '產生總分類帳 (General Ledger)' })
  @ApiResponse({ status: 200, description: '成功產生總分類帳' })
  @ApiQuery({ name: 'accountId', required: true, description: '會計科目ID' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getGeneralLedger(
    @Query('accountId') accountId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // TODO: Implement general ledger
    return { message: 'General ledger not yet implemented', accountId, startDate, endDate };
  }

  @Get('sales-summary')
  @ApiOperation({ summary: '產生銷售彙總表' })
  @ApiResponse({ status: 200, description: '成功產生銷售彙總' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'groupBy', required: false, description: '分組依據: channel|month|product' })
  async getSalesSummary(
    @Query('entityId') entityId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: string,
  ) {
    // TODO: Implement sales summary
    return { message: 'Sales summary not yet implemented', entityId, startDate, endDate, groupBy };
  }
}
