import { Controller, Get, Post, Body, Param, UseGuards, Query, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExpenseService } from './expense.service';

/**
 * 費用控制器
 * 管理費用請款、報銷申請、審批流程
 */
@ApiTags('expense')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get('requests')
  @ApiOperation({ summary: '查詢費用請款列表' })
  @ApiResponse({ status: 200, description: '成功取得費用請款列表' })
  async getExpenseRequests(
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
  ) {
    return this.expenseService.getExpenseRequests(entityId, status);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: '查詢單一費用請款' })
  @ApiResponse({ status: 200, description: '成功取得費用請款詳情' })
  async getExpenseRequest(@Param('id') id: string) {
    throw new Error('Not implemented');
  }

  @Post('requests')
  @ApiOperation({ summary: '建立費用請款' })
  @ApiResponse({ status: 201, description: '成功建立費用請款' })
  async createExpenseRequest(@Body() data: any) {
    return this.expenseService.createExpenseRequest(data);
  }

  @Put('requests/:id/approve')
  @ApiOperation({ summary: '核准費用請款' })
  @ApiResponse({ status: 200, description: '成功核准費用請款' })
  async approveExpense(@Param('id') id: string, @Body() data: any) {
    return this.expenseService.approveExpenseRequest(id, data.approverId);
  }

  @Put('requests/:id/reject')
  @ApiOperation({ summary: '拒絕費用請款' })
  @ApiResponse({ status: 200, description: '成功拒絕費用請款' })
  async rejectExpense(@Param('id') id: string, @Body() data: any) {
    return this.expenseService.rejectExpenseRequest(id, data.reason);
  }

  @Get('my-requests')
  @ApiOperation({ summary: '查詢我的費用請款' })
  @ApiResponse({ status: 200, description: '成功取得個人費用請款列表' })
  async getMyExpenseRequests(@Query('userId') userId: string) {
    throw new Error('Not implemented');
  }

  @Get('reimbursement-items')
  @ApiOperation({ summary: '取得可用的費用報銷項目（Reimbursement Items）' })
  @ApiResponse({ status: 200, description: '成功取得報銷項目清單' })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({
    name: 'roles',
    required: false,
    description: '以逗號分隔的角色代碼（例如：ADMIN,ACCOUNTANT）',
  })
  @ApiQuery({ name: 'departmentId', required: false })
  async getReimbursementItems(
    @Query('entityId') entityId: string,
    @Query('roles') roles?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const roleList = roles
      ? roles
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
      : undefined;

    return this.expenseService.getReimbursementItems(entityId, {
      roles: roleList,
      departmentId,
    });
  }
}
