import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExpenseService } from './expense.service';
import { CreateExpenseRequestDto } from './dto/create-expense-request.dto';
import { ApproveExpenseRequestDto } from './dto/approve-expense-request.dto';
import { RejectExpenseRequestDto } from './dto/reject-expense-request.dto';
import { SubmitExpenseFeedbackDto } from './dto/submit-feedback.dto';
import type { Request } from 'express';

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
    @Req() req?: Request,
  ) {
    const createdBy =
      req?.query?.mine === 'true' && req?.user
        ? (req.user as any).id
        : undefined;
    return this.expenseService.getExpenseRequests(entityId, status, createdBy);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: '查詢單一費用請款' })
  @ApiResponse({ status: 200, description: '成功取得費用請款詳情' })
  async getExpenseRequest(@Param('id') id: string) {
    return this.expenseService.getExpenseRequest(id);
  }

  @Post('requests')
  @ApiOperation({ summary: '建立費用請款' })
  @ApiResponse({ status: 201, description: '成功建立費用請款' })
  async createExpenseRequest(
    @Body() data: CreateExpenseRequestDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.expenseService.submitIntelligentExpenseRequest(data, {
      id: user.id,
      roleCodes: this.extractRoleCodes(user),
    });
  }

  @Put('requests/:id/approve')
  @ApiOperation({ summary: '核准費用請款' })
  @ApiResponse({ status: 200, description: '成功核准費用請款' })
  async approveExpense(
    @Param('id') id: string,
    @Body() data: ApproveExpenseRequestDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.expenseService.approveExpenseRequest(
      id,
      { id: user.id, roleCodes: this.extractRoleCodes(user) },
      data,
    );
  }

  @Put('requests/:id/reject')
  @ApiOperation({ summary: '拒絕費用請款' })
  @ApiResponse({ status: 200, description: '成功拒絕費用請款' })
  async rejectExpense(
    @Param('id') id: string,
    @Body() data: RejectExpenseRequestDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.expenseService.rejectExpenseRequest(
      id,
      { id: user.id, roleCodes: this.extractRoleCodes(user) },
      data,
    );
  }

  @Get('requests/:id/history')
  @ApiOperation({ summary: '取得費用申請歷程' })
  @ApiResponse({ status: 200, description: '成功取得歷程' })
  async getExpenseHistory(@Param('id') id: string) {
    return this.expenseService.getExpenseRequestHistory(id);
  }

  @Post('requests/:id/feedback')
  @ApiOperation({ summary: '提交建議結果回饋' })
  @ApiResponse({ status: 201, description: '成功送出回饋' })
  async submitFeedback(
    @Param('id') id: string,
    @Body() dto: SubmitExpenseFeedbackDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.expenseService.submitFeedback(
      id,
      { id: user.id, roleCodes: this.extractRoleCodes(user) },
      dto,
    );
  }

  @Get('my-requests')
  @ApiOperation({ summary: '查詢我的費用請款' })
  @ApiResponse({ status: 200, description: '成功取得個人費用請款列表' })
  async getMyExpenseRequests(@Req() req: Request) {
    const user = req.user as any;
    return this.expenseService.getExpenseRequests(
      undefined,
      undefined,
      user.id,
    );
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

  private extractRoleCodes(user: any): string[] {
    if (!user?.roles) {
      return [];
    }

    return user.roles
      .map((userRole: any) => userRole?.role?.code)
      .filter((code: string | undefined): code is string => Boolean(code));
  }
}
