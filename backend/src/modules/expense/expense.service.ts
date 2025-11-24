import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ExpenseRepository,
  ExpenseRequestWithGraph,
} from './expense.repository';
import { CreateExpenseRequestDto } from './dto/create-expense-request.dto';
import { ApproveExpenseRequestDto } from './dto/approve-expense-request.dto';
import { RejectExpenseRequestDto } from './dto/reject-expense-request.dto';
import { SubmitExpenseFeedbackDto } from './dto/submit-feedback.dto';
import { AccountingClassifierService } from './accounting-classifier.service';
import {
  CreateReimbursementItemDto,
  UpdateReimbursementItemDto,
} from './dto/manage-reimbursement-item.dto';

interface UserContext {
  id: string;
  roleCodes?: string[];
}

/**
 * 費用管理服務
 *
 * 核心功能：
 * 1. 費用申請單管理
 * 2. 費用分類與科目對應
 * 3. 費用審核流程
 * 4. 費用報銷與付款
 */
@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly classifierService: AccountingClassifierService,
  ) {}
  /**
   * 建立費用申請單
   */
  async createExpenseRequest(
    data: CreateExpenseRequestDto,
    requestedBy: UserContext,
  ) {
    return this.submitIntelligentExpenseRequest(data, requestedBy);
  }

  /**
   * 查詢費用申請單列表
   */
  async getExpenseRequests(
    entityId?: string,
    status?: string,
    createdBy?: string,
  ) {
    return this.expenseRepository.listExpenseRequests({
      entityId,
      status,
      createdBy,
    });
  }

  /**
   * 審核費用申請
   */
  async approveExpenseRequest(
    requestId: string,
    approver: UserContext,
    payload: ApproveExpenseRequestDto,
  ) {
    const request = await this.ensureExpenseRequest(requestId);
    const finalAccountId =
      payload.finalAccountId ||
      request.finalAccountId ||
      request.suggestedAccountId;

    const updated =
      await this.expenseRepository.updateExpenseRequestWithHistory(
        requestId,
        {
          status: 'approved',
          approvalUserId: approver.id,
          approvedAt: payload.decidedAt ?? new Date(),
          finalAccountId: finalAccountId ?? null,
          metadata: this.mergeMetadata(request.metadata, payload.metadata),
        },
        {
          action: 'approved',
          fromStatus: request.status,
          toStatus: 'approved',
          actorId: approver.id,
          actorRoleCode: approver.roleCodes?.[0],
          note: payload.remark,
          metadata: this.toJsonObject(payload.metadata),
          attachments: this.toJsonArray(payload.attachments),
          suggestedAccountId: request.suggestedAccountId ?? undefined,
          finalAccountId: finalAccountId ?? undefined,
        },
        request.suggestedAccountId
          ? {
              suggestedAccountId: request.suggestedAccountId,
              chosenAccountId: finalAccountId ?? request.suggestedAccountId,
              confidence: request.suggestionConfidence ?? new Prisma.Decimal(0),
              label:
                finalAccountId && request.suggestedAccountId !== finalAccountId
                  ? 'incorrect'
                  : 'correct',
              features: request.metadata ?? undefined,
              createdBy: approver.id,
            }
          : undefined,
      );

    return updated;
  }

  /**
   * 拒絕費用申請
   */
  async rejectExpenseRequest(
    requestId: string,
    approver: UserContext,
    payload: RejectExpenseRequestDto,
  ) {
    const request = await this.ensureExpenseRequest(requestId);

    return this.expenseRepository.updateExpenseRequestWithHistory(
      requestId,
      {
        status: 'rejected',
        approvalUserId: approver.id,
        approvedAt: payload.decidedAt ?? new Date(),
        metadata: this.mergeMetadata(request.metadata, payload.metadata),
      },
      {
        action: 'rejected',
        fromStatus: request.status,
        toStatus: 'rejected',
        actorId: approver.id,
        actorRoleCode: approver.roleCodes?.[0],
        note: payload.reason,
        metadata: this.toJsonObject(payload.metadata),
        attachments: this.toJsonArray(payload.attachments),
        suggestedAccountId: request.suggestedAccountId ?? undefined,
        finalAccountId: request.finalAccountId ?? undefined,
      },
      request.suggestedAccountId
        ? {
            suggestedAccountId: request.suggestedAccountId,
            chosenAccountId: request.finalAccountId ?? null,
            confidence: request.suggestionConfidence ?? new Prisma.Decimal(0),
            label: 'rejected',
            features: request.metadata ?? undefined,
            createdBy: approver.id,
          }
        : undefined,
    );
  }

  /**
   * 費用報銷（產生付款）
   */
  async reimburseExpense(requestId: string) {
    // TODO: 建立付款記錄
    // TODO: 產生會計分錄
  }

  /**
   * 費用分類報表
   */
  async getExpenseByCategory(entityId: string, startDate: Date, endDate: Date) {
    // TODO: 依費用類別統計
  }

  // submitExpenseRequest 已由 submitIntelligentExpenseRequest 取代

  /**
   * 連結至應付發票
   * @param expenseRequestId - 費用申請ID
   * @param apInvoiceId - 應付發票ID
   * @returns 更新後的費用申請單
   */
  async linkToApInvoice(expenseRequestId: string, apInvoiceId: string) {
    this.logger.log(
      `Linking expense request ${expenseRequestId} to AP invoice ${apInvoiceId}`,
    );
    throw new Error('Not implemented: linkToApInvoice');
  }

  /**
   * 按類別統計費用
   * @param entityId - 實體ID
   * @param startDate - 開始日期
   * @param endDate - 結束日期
   * @returns 費用統計報表
   */
  async getExpensesByCategory(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.log(
      `Getting expenses by category for entity ${entityId}, period: ${startDate} - ${endDate}`,
    );
    throw new Error('Not implemented: getExpensesByCategory');
  }

  /**
   * 取得可用的報銷項目（ReimbursementItem）清單
   * 會根據 entity / 角色 / 部門過濾
   */
  async getReimbursementItems(
    entityId: string,
    options?: { roles?: string[]; departmentId?: string },
  ) {
    this.logger.log(
      `Fetching reimbursement items for entity ${entityId} with roles=${options?.roles?.join(',') ?? 'N/A'} department=${
        options?.departmentId ?? 'N/A'
      }`,
    );
    return this.expenseRepository.findActiveReimbursementItems(
      entityId,
      options,
    );
  }

  async listReimbursementItemsAdmin(
    entityId?: string,
    includeInactive?: boolean,
  ) {
    return this.expenseRepository.listReimbursementItemsAdmin({
      entityId,
      includeInactive,
    });
  }

  async getReimbursementItemAdmin(id: string) {
    return this.ensureReimbursementItem(id);
  }

  async createReimbursementItemAdmin(dto: CreateReimbursementItemDto) {
    return this.expenseRepository.createReimbursementItem(
      this.buildReimbursementItemCreatePayload(dto),
    );
  }

  async updateReimbursementItemAdmin(
    id: string,
    dto: UpdateReimbursementItemDto,
  ) {
    await this.ensureReimbursementItem(id);
    return this.expenseRepository.updateReimbursementItem(
      id,
      this.buildReimbursementItemUpdatePayload(dto),
    );
  }

  async archiveReimbursementItemAdmin(id: string) {
    await this.ensureReimbursementItem(id);
    return this.expenseRepository.archiveReimbursementItem(id);
  }

  async listApprovalPolicies(entityId?: string) {
    return this.expenseRepository.listApprovalPolicies(entityId);
  }

  async submitIntelligentExpenseRequest(
    dto: CreateExpenseRequestDto,
    requestedBy: UserContext,
  ) {
    const amountCurrency = dto.amountCurrency ?? 'TWD';
    const amountFxRate = dto.amountFxRate ?? 1;
    const amountBase = this.toDecimal(dto.amountOriginal * amountFxRate);

    const reimbursementItem = dto.reimbursementItemId
      ? await this.expenseRepository.getReimbursementItemDetail(
          dto.reimbursementItemId,
        )
      : null;

    const suggestion = await this.classifierService.suggestAccount({
      entityId: dto.entityId,
      description: dto.description,
      amountOriginal: dto.amountOriginal,
      amountCurrency,
      reimbursementItemId: dto.reimbursementItemId,
      reimbursementItemKeywords: this.parseKeywords(
        reimbursementItem?.keywords,
      ),
      reimbursementItemAccountId: reimbursementItem?.accountId,
      vendorId: dto.vendorId,
      departmentId: dto.departmentId,
      receiptType:
        dto.receiptType ?? reimbursementItem?.defaultReceiptType ?? undefined,
      metadata: dto.metadata,
    });

    const approvalSteps = this.buildApprovalSteps(
      reimbursementItem?.approvalPolicy?.steps ?? [],
      dto.amountOriginal,
      dto.departmentId,
    );

    const requestData: Prisma.ExpenseRequestUncheckedCreateInput = {
      entityId: dto.entityId,
      vendorId: dto.vendorId ?? null,
      reimbursementItemId: dto.reimbursementItemId ?? null,
      amountOriginal: this.toDecimal(dto.amountOriginal),
      amountCurrency,
      amountFxRate: this.toDecimal(amountFxRate),
      amountBase,
      dueDate: dto.dueDate ?? null,
      description: dto.description,
      priority: dto.priority ?? 'normal',
      attachmentUrl: dto.attachmentUrl ?? null,
      evidenceFiles: this.toJsonArray(dto.evidenceFiles),
      departmentId: dto.departmentId ?? null,
      receiptType:
        dto.receiptType ?? reimbursementItem?.defaultReceiptType ?? null,
      createdBy: requestedBy.id,
      status: 'pending',
      suggestedAccountId: suggestion.accountId ?? null,
      finalAccountId: null,
      suggestionConfidence: this.toDecimal(suggestion.confidence),
      metadata: this.buildJsonObject(dto.metadata, {
        classifierFeatures: suggestion.features,
      }),
    };

    const history = {
      action: 'submitted',
      fromStatus: 'draft',
      toStatus: 'pending',
      actorId: requestedBy.id,
      actorRoleCode: requestedBy.roleCodes?.[0],
      note: dto.description,
      metadata: this.toJsonObject(suggestion.features),
      suggestedAccountId: suggestion.accountId ?? undefined,
    };

    const classifierFeedback = suggestion.accountId
      ? {
          suggestedAccountId: suggestion.accountId,
          confidence: this.toDecimal(suggestion.confidence),
          label: 'pending',
          features: this.toJsonObject(suggestion.features),
          createdBy: requestedBy.id,
        }
      : undefined;

    return this.expenseRepository.createExpenseRequestGraph({
      requestData,
      history,
      approvalSteps,
      classifierFeedback,
    });
  }

  async getExpenseRequestHistory(id: string) {
    await this.ensureExpenseRequest(id);
    return this.expenseRepository.listHistories(id);
  }

  async getExpenseRequest(id: string) {
    return this.ensureExpenseRequest(id);
  }

  async submitFeedback(
    requestId: string,
    user: UserContext,
    dto: SubmitExpenseFeedbackDto,
  ) {
    await this.ensureExpenseRequest(requestId);

    return this.expenseRepository.createFeedbackEntry({
      expenseRequestId: requestId,
      suggestedAccountId: dto.suggestedAccountId ?? null,
      chosenAccountId: dto.chosenAccountId ?? null,
      confidence: dto.confidence ? this.toDecimal(dto.confidence) : undefined,
      label: dto.label,
      features: this.toJsonObject(dto.features),
      createdBy: user.id,
    });
  }

  private async ensureExpenseRequest(
    id: string,
  ): Promise<ExpenseRequestWithGraph> {
    const request = await this.expenseRepository.findRequestById(id);
    if (!request) {
      throw new NotFoundException(`Expense request ${id} not found`);
    }
    return request as ExpenseRequestWithGraph;
  }

  private async ensureReimbursementItem(id: string) {
    const item = await this.expenseRepository.getReimbursementItemDetail(id);
    if (!item) {
      throw new NotFoundException(`Reimbursement item ${id} not found`);
    }
    return item;
  }

  private toDecimal(value: number) {
    if (Number.isNaN(value)) {
      throw new BadRequestException('Amount must be a valid number');
    }
    return new Prisma.Decimal(Number(value.toFixed(2)));
  }

  private parseKeywords(value?: string | null) {
    return value
      ? value
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : [];
  }

  private buildApprovalSteps(
    steps: Array<{
      stepOrder: number;
      approverRoleCode: string | null;
      requiresDepartmentHead: boolean;
      minAmount: Prisma.Decimal | null;
      maxAmount: Prisma.Decimal | null;
    }> = [],
    amountOriginal: number,
    departmentId?: string,
  ) {
    if (!steps.length) {
      return [];
    }

    return steps
      .filter((step) => this.withinThreshold(step, amountOriginal))
      .map((step) => ({
        stepOrder: step.stepOrder,
        status: 'pending',
        approverRoleCode: step.approverRoleCode ?? undefined,
        departmentId: step.requiresDepartmentHead
          ? (departmentId ?? null)
          : null,
        amountThreshold: this.toDecimal(amountOriginal),
      }));
  }

  private withinThreshold(
    step: {
      minAmount?: Prisma.Decimal | null;
      maxAmount?: Prisma.Decimal | null;
    },
    amount: number,
  ) {
    const min = step.minAmount ? Number(step.minAmount) : undefined;
    const max = step.maxAmount ? Number(step.maxAmount) : undefined;
    if (typeof min !== 'undefined' && amount < min) {
      return false;
    }
    if (typeof max !== 'undefined' && amount > max) {
      return false;
    }
    return true;
  }

  private buildJsonObject(
    base?: Record<string, unknown> | null,
    extra?: Record<string, unknown>,
  ): Prisma.JsonObject | undefined {
    if (!base && !extra) {
      return undefined;
    }

    const merged: Record<string, unknown> = {
      ...(base ?? {}),
      ...(extra ?? {}),
    };

    if (!Object.keys(merged).length) {
      return undefined;
    }

    return merged as Prisma.JsonObject;
  }

  private toJsonObject(
    value?: Record<string, unknown> | null,
  ): Prisma.JsonObject | undefined {
    if (!value) {
      return undefined;
    }
    return { ...value } as Prisma.JsonObject;
  }

  private toJsonArray<T>(value?: T[] | null): Prisma.JsonArray | undefined {
    if (!value) {
      return undefined;
    }
    return value as unknown as Prisma.JsonArray;
  }

  private jsonValueToObject(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...(value as Record<string, unknown>) };
  }

  private mergeMetadata(
    existing: Prisma.JsonValue | null | undefined,
    incoming?: Record<string, unknown>,
  ): Prisma.JsonObject | undefined {
    if (!existing && !incoming) {
      return undefined;
    }

    const current = this.jsonValueToObject(existing);
    const merged: Record<string, unknown> = {
      ...current,
      ...(incoming ?? {}),
    };

    if (!Object.keys(merged).length) {
      return undefined;
    }

    return merged as Prisma.JsonObject;
  }

  private buildReimbursementItemCreatePayload(
    dto: CreateReimbursementItemDto,
  ): Prisma.ReimbursementItemUncheckedCreateInput {
    return {
      entityId: dto.entityId,
      name: dto.name,
      accountId: dto.accountId,
      description: dto.description ?? null,
      keywords: this.stringifyList(dto.keywords),
      amountLimit:
        typeof dto.amountLimit === 'number'
          ? this.toDecimal(dto.amountLimit)
          : undefined,
      requiresDepartmentHead: dto.requiresDepartmentHead ?? false,
      approverRoleCodes: this.stringifyList(dto.approverRoleCodes),
      approvalPolicyId: dto.approvalPolicyId ?? null,
      defaultReceiptType: dto.defaultReceiptType ?? null,
      allowedReceiptTypes: this.stringifyList(dto.allowedReceiptTypes),
      allowedRoles: this.stringifyList(dto.allowedRoles),
      allowedDepartments: this.stringifyList(dto.allowedDepartments),
      isActive: dto.isActive ?? true,
    } as Prisma.ReimbursementItemUncheckedCreateInput;
  }

  private buildReimbursementItemUpdatePayload(
    dto: UpdateReimbursementItemDto,
  ): Prisma.ReimbursementItemUncheckedUpdateInput {
    const payload: Prisma.ReimbursementItemUncheckedUpdateInput = {};

    if (typeof dto.entityId !== 'undefined') {
      payload.entityId = dto.entityId;
    }
    if (typeof dto.name !== 'undefined') {
      payload.name = dto.name;
    }
    if (typeof dto.accountId !== 'undefined') {
      payload.accountId = dto.accountId;
    }
    if (typeof dto.description !== 'undefined') {
      payload.description = dto.description ?? null;
    }
    if (typeof dto.keywords !== 'undefined') {
      payload.keywords = this.stringifyList(dto.keywords);
    }
    if (typeof dto.amountLimit !== 'undefined') {
      payload.amountLimit = this.toDecimal(dto.amountLimit);
    }
    if (typeof dto.requiresDepartmentHead !== 'undefined') {
      payload.requiresDepartmentHead = dto.requiresDepartmentHead;
    }
    if (typeof dto.approverRoleCodes !== 'undefined') {
      payload.approverRoleCodes = this.stringifyList(dto.approverRoleCodes);
    }
    if (typeof dto.approvalPolicyId !== 'undefined') {
      payload.approvalPolicyId = dto.approvalPolicyId ?? null;
    }
    if (typeof dto.defaultReceiptType !== 'undefined') {
      payload.defaultReceiptType = dto.defaultReceiptType ?? null;
    }
    if (typeof dto.allowedReceiptTypes !== 'undefined') {
      payload.allowedReceiptTypes = this.stringifyList(
        dto.allowedReceiptTypes,
      );
    }
    if (typeof dto.allowedRoles !== 'undefined') {
      payload.allowedRoles = this.stringifyList(dto.allowedRoles);
    }
    if (typeof dto.allowedDepartments !== 'undefined') {
      payload.allowedDepartments = this.stringifyList(
        dto.allowedDepartments,
      );
    }
    if (typeof dto.isActive !== 'undefined') {
      payload.isActive = dto.isActive;
    }

    return payload;
  }

  private stringifyList(values?: string[]) {
    if (!values) {
      return null;
    }
    const normalized = values
      .map((value) => value.trim())
      .filter((value) => value.length);
    return normalized.length ? normalized.join(',') : null;
  }
}
