import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AfterSalesLegacyAdapter } from './after-sales-legacy.adapter';
import {
  auditAfterSalesMigrationBatch,
  auditAfterSalesMigrationCandidate,
} from './after-sales-migration-audit';

type PageInput = {
  limit?: number;
  cursor?: string;
  updatedAfter?: string;
};

@Injectable()
export class AfterSalesMigrationService {
  constructor(
    private readonly legacyAdapter: AfterSalesLegacyAdapter,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async previewCase(caseId: string) {
    const source = await this.legacyAdapter.getCase(caseId);

    return {
      mode: 'dry_run',
      contractVersion: source.contractVersion,
      sourceCommit: source.sourceCommit,
      featureBaseline: source.featureBaseline ?? null,
      audit: auditAfterSalesMigrationCandidate(source.item),
    };
  }

  async previewPage(input: PageInput) {
    const source = await this.loadPage(input);

    return {
      mode: 'dry_run',
      contractVersion: source.contractVersion,
      sourceCommit: source.sourceCommit,
      featureBaseline: source.featureBaseline,
      page: source.page,
      audit: source.audit,
    };
  }

  async stagePage(entityId: string, input: PageInput) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException('找不到公司實體');

    const source = await this.loadPage(input);
    const invalidIdentity = source.records.some(
      ({ summaryId, audit }) =>
        !audit.sourceRecordId || audit.sourceRecordId !== summaryId,
    );
    if (invalidIdentity) {
      throw new BadGatewayException('售後來源案件識別不一致，已停止 staging');
    }

    const now = new Date();
    const retentionUntil = new Date(
      now.getTime() + this.retentionDays() * 24 * 60 * 60 * 1000,
    );

    const staged = await this.prisma.$transaction(async (tx) => {
      const createdRun = await tx.afterSalesImportRun.create({
        data: {
          entityId,
          mode: 'staging',
          status: source.audit.status,
          contractVersion: source.contractVersion,
          sourceCommit: source.sourceCommit,
          featureBaseline: source.featureBaseline,
          scannedCount: source.audit.summary.total,
          candidateCount: source.audit.summary.candidate,
          needsReviewCount: source.audit.summary.needsReview,
          deletedCount: source.audit.summary.deleted,
          unmappedItemCount: source.audit.summary.unmappedItems,
          summary: source.audit.summary,
          completedAt: now,
        },
      });

      const effects = {
        created: 0,
        updated: 0,
        unchanged: 0,
      };

      for (const record of source.records) {
        const sourceRecordId = record.audit.sourceRecordId as string;
        const identity = {
          entityId,
          sourceSystem: 'legacy_after_sales',
          sourceRecordId,
        };
        const existing = await tx.afterSalesImportCandidate.findUnique({
          where: { entityId_sourceSystem_sourceRecordId: identity },
          select: { checksum: true },
        });
        const data = {
          sourceCaseNumber: record.audit.caseNumber,
          sourceCaseType: record.audit.caseType,
          sourceCaseStatus: record.audit.caseStatus,
          sourceUpdatedAt: this.validDate(record.audit.sourceUpdatedAt),
          sourceDeletedAt: this.validDate(record.audit.sourceDeletedAt),
          checksum: record.audit.checksum,
          decision: record.audit.decision,
          issues:
            record.audit.issues.length > 0
              ? (record.audit.issues as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          payload: record.payload,
          lastSeenRunId: createdRun.id,
          lastSeenAt: now,
          retentionUntil,
        };

        await tx.afterSalesImportCandidate.upsert({
          where: {
            entityId_sourceSystem_sourceRecordId: identity,
          },
          create: {
            entityId,
            sourceSystem: 'legacy_after_sales',
            sourceRecordId,
            ...data,
          },
          update: data,
        });

        if (!existing) {
          effects.created += 1;
        } else if (existing.checksum === record.audit.checksum) {
          effects.unchanged += 1;
        } else {
          effects.updated += 1;
        }
      }

      return { run: createdRun, effects };
    });

    return {
      mode: 'staging',
      runId: staged.run.id,
      status: staged.run.status,
      contractVersion: staged.run.contractVersion,
      sourceCommit: staged.run.sourceCommit,
      featureBaseline: staged.run.featureBaseline,
      page: source.page,
      summary: source.audit.summary,
      effects: staged.effects,
    };
  }

  private async loadPage(input: PageInput) {
    const list = await this.legacyAdapter.listCases({
      limit: Math.min(Math.max(input.limit ?? 25, 1), 50),
      cursor: input.cursor,
      updatedAfter: input.updatedAfter,
      includeDeleted: true,
    });
    const records: Array<{
      summaryId: string;
      payload: Prisma.InputJsonValue;
      audit: ReturnType<typeof auditAfterSalesMigrationCandidate>;
    }> = [];

    for (const summary of list.items) {
      const detail = await this.legacyAdapter.getCase(summary.id);
      if (
        detail.contractVersion !== list.contractVersion ||
        detail.sourceCommit !== list.sourceCommit
      ) {
        throw new BadGatewayException(
          '售後來源版本在同一批次中發生變更，已停止處理',
        );
      }

      records.push({
        summaryId: summary.id,
        payload: detail.item as Prisma.InputJsonValue,
        audit: auditAfterSalesMigrationCandidate(detail.item),
      });
    }

    return {
      contractVersion: list.contractVersion,
      sourceCommit: list.sourceCommit,
      featureBaseline: list.featureBaseline ?? null,
      page: list.page,
      records,
      audit: auditAfterSalesMigrationBatch(
        records.map((record) => record.payload),
      ),
    };
  }

  private retentionDays() {
    const configured = Number(
      this.configService.get<string>(
        'AFTER_SALES_STAGING_RETENTION_DAYS',
        '90',
      ),
    );
    return Number.isInteger(configured) && configured >= 30 && configured <= 365
      ? configured
      : 90;
  }

  private validDate(value: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
